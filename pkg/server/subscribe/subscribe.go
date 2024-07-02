package subscribe

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"ethan/pkg/db"
	"ethan/pkg/mstoken"

	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphmodels "github.com/microsoftgraph/msgraph-sdk-go/models"
	"github.com/sirupsen/logrus"
)

func PerUser(ctx context.Context, queries *db.Queries) {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			users, err := queries.ListUsers(ctx)
			if err != nil {
				logrus.Error(err)
				continue
			}
			for _, user := range users {
				tasks, err := queries.GetTaskFromUserID(ctx, user.ID)
				if err != nil {
					logrus.Error(err)
					continue
				}
				if len(tasks) > 0 {
					if user.SubscriptionID != nil {
						continue
					} else {
						sID, err := createSubscription(ctx, user)
						if err != nil {
							logrus.Error(err)
							continue
						}
						if err := queries.UpdateUser(ctx, db.UpdateUserParams{
							ID:             user.ID,
							Token:          user.Token,
							ExpireAt:       user.ExpireAt,
							SubscriptionID: &sID,
						}); err != nil {
							logrus.Error(err)
							continue
						}
					}
				}
			}
		}
	}
}

func createSubscription(ctx context.Context, user db.User) (string, error) {
	cred := mstoken.NewStaticTokenCredential(user.Token)
	client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
	if err != nil {
		return "", err
	}

	parts := strings.Split(os.Getenv("EMAIL_RECIPIENT"), ",")
	var recipients []string
	for _, part := range parts {
		recipients = append(recipients, strings.TrimSpace(part))
	}

	requestBody := graphmodels.NewSubscription()
	changeType := "created"
	requestBody.SetChangeType(&changeType)
	// replace this to production url
	notificationUrl := os.Getenv("PUBLIC_URL") + "/api/webhook"
	requestBody.SetNotificationUrl(&notificationUrl)
	resource := "me/mailFolders('Inbox')/messages"
	requestBody.SetResource(&resource)
	expirationDateTime := time.Now().Add(time.Hour * 24)
	requestBody.SetExpirationDateTime(&expirationDateTime)

	subscription, err := client.Subscriptions().Post(ctx, requestBody, nil)
	if err != nil {
		return "", err
	}
	return *subscription.GetId(), nil
}

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
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, err)
			return
		}
		cred := mstoken.NewStaticTokenCredential(user.Token)
		client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, err)
			return
		}

		resourceData := v.(map[string]interface{})["resourceData"].(map[string]interface{})
		messsageID := resourceData["id"].(string)
		message, err := client.Me().Messages().ByMessageId(messsageID).Get(r.Context(), nil)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, err)
			return
		}

		task, err := h.queries.GetTaskFromConversationID(r.Context(), message.GetConversationId())
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, err)
			return
		}

		name := *message.GetSender().GetEmailAddress().GetName()
		email := *message.GetSender().GetEmailAddress().GetAddress()

		content := fmt.Sprintf("%s (%s) Has replied", name, email)
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
	}
}
