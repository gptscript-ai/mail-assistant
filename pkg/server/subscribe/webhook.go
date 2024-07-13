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
	"github.com/google/uuid"

	"github.com/acorn-io/namegenerator"
	"github.com/gptscript-ai/go-gptscript"
	"github.com/gptscript-ai/gptscript/pkg/runner"
	"github.com/gptscript-ai/gptscript/pkg/types"
	"github.com/jackc/pgx/v5"
	abstractions "github.com/microsoft/kiota-abstractions-go"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"
	"github.com/sirupsen/logrus"
)

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
		messsageID := resourceData["id"].(string)
		headers := abstractions.NewRequestHeaders()
		headers.Add("Prefer", "outlook.body-content-type=text")
		configuration := &graphusers.ItemMessagesMessageItemRequestBuilderGetRequestConfiguration{
			Headers: headers,
		}
		message, err := client.Me().Messages().ByMessageId(messsageID).Get(r.Context(), configuration)
		if err != nil {
			logrus.Error(fmt.Errorf("failed to get messsage message: %w", err))
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		task, err := h.queries.GetTaskFromConversationID(context.Background(), message.GetConversationId())
		if errors.Is(err, pgx.ErrNoRows) {
			// if we can't find task, let LLM decide whether to create a new task based on email content.
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

			run, err := gptClient.Evaluate(context.Background(), gptscript.Options{}, gptscript.ToolDef{
				Instructions: fmt.Sprintf(`Given email subject: %v\, Check if this is related to a meeting. Answer yes or no. \n `, *message.GetSubject()),
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
					Instructions: fmt.Sprintf(`Given email body: %v, summarize the email content and Assign a name for this email. Give me a json object that has name and summary as keys. use lower case.`, *message.GetBody().GetContent()),
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
				var output struct {
					Summary string `json:"summary"`
					Name    string `json:"name"`
				}
				if err := json.Unmarshal([]byte(out), &output); err != nil {
					logrus.Error(fmt.Errorf("failed to unmarshal output: %w", err))
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
			name := *message.GetSender().GetEmailAddress().GetName()
			email := *message.GetSender().GetEmailAddress().GetAddress()
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
