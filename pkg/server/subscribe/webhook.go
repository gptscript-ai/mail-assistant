package subscribe

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"strings"

	"ethan/pkg/db"
	"ethan/pkg/mstoken"
	"ethan/pkg/server/connection"
	"ethan/pkg/tool"
	"github.com/acorn-io/namegenerator"
	"github.com/google/uuid"
	"github.com/gptscript-ai/go-gptscript"
	"github.com/gptscript-ai/gptscript/pkg/runner"
	"github.com/gptscript-ai/gptscript/pkg/types"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	abstractions "github.com/microsoft/kiota-abstractions-go"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"
	"github.com/sirupsen/logrus"
)

var (
	SkipEmails = map[string]struct{}{}
)

var checkSpamTemplatePrompt = `
Given email body: %v, email sender: %v, email subject: %v, Check if email belongs to a cold email.
Do not mark it as cold email of the sender has an email address that is the same domain as yours email(%v).
For other cases, make your own decision by checking the subject and email body. Look for the following rule when detecting:
1. Cold email could lack the presence of personalized elements (recipient's name, specific references) in their email content
2. The email does not mention the recipient's name or any specific details about them or their company.
3. The email covers broad topics or services that could apply to many recipients.
4. The email uses marketing or sales language, focusing on the benefits of a product or service.
Answer yes or no.
`

type Handler struct {
	queries *db.Queries
}

func NewHandler(queries *db.Queries) *Handler {
	return &Handler{
		queries: queries,
	}
}

func (h *Handler) Subscribe(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("validationToken")
	if token != "" {
		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte(token))
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Unable to read request body", http.StatusInternalServerError)
		return
	}
	defer r.Body.Close()

	var bodyJson map[string]interface{}
	if err := json.Unmarshal(body, &bodyJson); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprint(w, err)
		return
	}

	values := bodyJson["value"].([]interface{})
	for _, v := range values {
		subscriptionId := v.(map[string]interface{})["subscriptionId"].(string)
		user, err := h.queries.GetUserFromSubscriptionID(r.Context(), &subscriptionId)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				w.WriteHeader(http.StatusOK)
				return
			}
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		cred := mstoken.NewStaticTokenCredential(user.Token)
		client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
		if err != nil {
			logrus.Error(fmt.Errorf("failed to create graph client: %w", err))
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		resourceData := v.(map[string]interface{})["resourceData"].(map[string]interface{})
		messageID := resourceData["id"].(string)
		headers := abstractions.NewRequestHeaders()
		headers.Add("Prefer", "outlook.body-content-type=text")
		configuration := &graphusers.ItemMessagesMessageItemRequestBuilderGetRequestConfiguration{
			Headers: headers,
		}
		message, err := client.Me().Messages().ByMessageId(messageID).Get(r.Context(), configuration)
		if err != nil {
			logrus.Error(fmt.Errorf("failed to get messsage message: %w", err))
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		logrus.Infof("Received message with no task from conversation %v", *message.GetConversationId())
		gptClient, err := gptscript.NewGPTScript(gptscript.GlobalOptions{
			OpenAIAPIKey: os.Getenv("OPENAI_API_KEY"),
			Env:          append(os.Environ(), fmt.Sprintf("GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN=%v", user.Token)),
		})
		if err != nil {
			logrus.Error(fmt.Errorf("failed to create gptscript client: %w", err))
			return
		}
		defer gptClient.Close()

		name := *message.GetSender().GetEmailAddress().GetName()
		email := *message.GetSender().GetEmailAddress().GetAddress()
		subject := *message.GetSubject()
		emailContent := *message.GetBody().GetContent()

		task, err := h.queries.GetTaskFromConversationID(context.Background(), message.GetConversationId())
		if errors.Is(err, pgx.ErrNoRows) {
			if user.CheckSpam != nil && *user.CheckSpam {
				// Once we identified te the email is related to meeting, use AI to check whether email belongs to cold email. If so, move it to spam
				if _, ok := SkipEmails[messageID]; !ok {
					checkSpamRun, err := gptClient.Evaluate(context.Background(), gptscript.Options{}, gptscript.ToolDef{
						Instructions: fmt.Sprintf(checkSpamTemplatePrompt, emailContent, email, subject, user.Email),
					})
					if err != nil {
						logrus.Error(fmt.Errorf("failed to run gptscript to check email content to detect spam: %w", err))
						w.WriteHeader(http.StatusInternalServerError)
						return
					}
					checkSpamRunOutput, err := checkSpamRun.Text()
					if err != nil {
						logrus.Error(fmt.Errorf("failed to run gptscript to check email content to detect spam: %w", err))
						w.WriteHeader(http.StatusInternalServerError)
						return
					}

					if strings.ToLower(checkSpamRunOutput) == "yes" {
						logrus.Infof("Mark message %v as Spam cold email, moving to Cold Email folder", messageID)

						folders, err := client.Me().MailFolders().Get(r.Context(), nil)
						if err != nil {
							logrus.Error(fmt.Errorf("failed to get folder list: %w", err))
							w.WriteHeader(http.StatusInternalServerError)
							return
						}
						var coldEmailFolderID string
						for _, folder := range folders.GetValue() {
							if folder.GetDisplayName() != nil && *folder.GetDisplayName() == "Cold Emails" {
								coldEmailFolderID = *folder.GetId()
								break
							}
						}

						if coldEmailFolderID == "" {
							logrus.Error("Failed to find cold email folder")
							return
						}

						requestBody := graphusers.NewItemMailfoldersItemMessagesItemMovePostRequestBody()
						requestBody.SetDestinationId(&coldEmailFolderID)
						newMessage, err := client.Me().Messages().ByMessageId(messageID).Move().Post(r.Context(), requestBody, nil)
						if err != nil {
							logrus.Error("Failed to move message to junk items")
							w.WriteHeader(http.StatusInternalServerError)
							return
						}

						if err := h.queries.CreateSpamEmailRecord(r.Context(), db.CreateSpamEmailRecordParams{
							Subject:   &subject,
							EmailBody: &emailContent,
							UserID:    user.ID,
							MessageID: newMessage.GetId(),
						}); err != nil {
							logrus.Error(fmt.Errorf("failed to create spam email record: %w", err))
							w.WriteHeader(http.StatusInternalServerError)
							return
						}

						if err := h.queries.CreateMessage(r.Context(), db.CreateMessageParams{
							MessageID: newMessage.GetId(),
							Content:   &[]string{fmt.Sprint("Mark incoming email as SPAM")}[0],
							UserID:    user.ID,
							TaskID: pgtype.UUID{
								Valid: false,
							},
						}); err != nil {
							logrus.Error(fmt.Errorf("failed to create spam email message: %w", err))
							w.WriteHeader(http.StatusInternalServerError)
							return
						}
						return
					}
				}
			}
			// if we can't find task, let LLM decide whether to create a new task based on email content.
			run, err := gptClient.Evaluate(context.Background(), gptscript.Options{}, gptscript.ToolDef{
				Instructions: fmt.Sprintf(`Given email subject: %v\, Check if this is related to a meeting. Answer yes or no. \n `, subject),
			})

			defer run.Close()

			output, err := run.Text()
			if err != nil {
				logrus.Error(fmt.Errorf("failed to run gptscript to check email content: %w", err))
				w.WriteHeader(http.StatusInternalServerError)
				return
			}

			if strings.ToLower(output) == "yes" {
				nameRun, err := gptClient.Evaluate(context.Background(), gptscript.Options{}, gptscript.ToolDef{
					Instructions: fmt.Sprintf(`Given email body: %v, summarize the email content and Assign a name for this email. Give me a json object that has name and summary as keys. use lower case. Just return string represetation of json object that can be serialized.'`, *message.GetBody().GetContent()),
				})
				if err != nil {
					logrus.Error(fmt.Errorf("failed to run gptscript to check email content: %w", err))
					w.WriteHeader(http.StatusInternalServerError)
					return
				}

				out, err := nameRun.Text()
				if err != nil {
					logrus.Error(fmt.Errorf("failed to run gptscript to get name: %w", err))
					w.WriteHeader(http.StatusInternalServerError)
					return
				}

				// Sometimes LLM gives repsonse wrapped by ```json```, this is to workaround that
				out = strings.TrimSuffix(strings.TrimPrefix(out, "```json"), "```")
				var output struct {
					Summary string `json:"summary"`
					Name    string `json:"name"`
				}
				if err := json.Unmarshal([]byte(out), &output); err != nil {
					logrus.Error(fmt.Errorf("failed to unmarshal output: %v, %w", out, err))
					w.WriteHeader(http.StatusInternalServerError)
					return
				}

				name := output.Name
				if name == "" {
					name = namegenerator.NewNameGenerator(rand.Int63()).Generate()
				}

				taskParam := db.CreateTaskParams{
					Name:           name,
					Description:    output.Summary,
					ToolDefinition: &tool.DefaultToolDef,
					UserID:         user.ID,
					MessageID:      message.GetId(),
					MessageBody:    message.GetBody().GetContent(),
				}
				task, err := h.queries.CreateTask(context.Background(), taskParam)
				if err != nil {
					logrus.Error(fmt.Errorf("failed to create task: %w", err))
					return
				}
				messsageContent := fmt.Sprintf("Task %v is created.", task.Name)
				if err := h.queries.CreateMessage(context.Background(), db.CreateMessageParams{
					MessageID: message.GetId(),
					Content:   &messsageContent,
					TaskID:    task.ID,
					UserID:    user.ID,
				}); err != nil {
					w.WriteHeader(http.StatusInternalServerError)
					fmt.Fprint(w, err)
					return
				}
			}
		} else if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, err)
			return
		} else {
			content := fmt.Sprintf("%s has replied to your email", name)

			if err := h.queries.CreateMessage(r.Context(), db.CreateMessageParams{
				MessageID: message.GetId(),
				Content:   &content,
				TaskID:    task.ID,
				UserID:    user.ID,
			}); err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				fmt.Fprint(w, err)
				return
			}

			messageTemplate := `
%v(%v) has replied your email with the following content: %v.
If all the participants have replied, ask user about the next step. If not, remind user who haven't replied.
`
			var ret runner.State
			if err := json.Unmarshal(task.State, &ret); err != nil {
				logrus.Error(fmt.Errorf("failed to unmarshal state: %w", err))
				return
			}

			if ret.Continuation != nil && ret.Continuation.State != nil {
				ret.Continuation.State.Completion.Messages = append(ret.Continuation.State.Completion.Messages, types.CompletionMessage{
					Role: types.CompletionMessageRoleTypeAssistant,
					Content: []types.ContentPart{
						{
							Text: fmt.Sprintf(messageTemplate, name, email, *message.GetBody().GetContent()),
						},
					},
				})
			}

			state, err := json.Marshal(ret)
			if err != nil {
				logrus.Error(fmt.Errorf("failed to marshal state: %w", err))
				return
			}
			if err := h.queries.UpdateTaskState(r.Context(), db.UpdateTaskStateParams{
				ID:    task.ID,
				State: state,
			}); err != nil {
				logrus.Error(fmt.Errorf("failed to update task state: %w", err))
				return
			}

			// Manually close possible active connection to resume task, so that user get latest information
			connection.CloseConn(uuid.UUID(task.ID.Bytes).String())
		}
	}
}
