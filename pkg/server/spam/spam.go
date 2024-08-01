package spam

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"ethan/pkg/db"
	"ethan/pkg/mstoken"
	"ethan/pkg/server/subscribe"
	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"
	"github.com/sirupsen/logrus"
)

type Handler struct {
	queries *db.Queries
}

func NewHandler(queries *db.Queries) *Handler {
	return &Handler{queries}
}

func (h *Handler) ListSpams(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var uid pgtype.UUID
	if err := uid.Scan(userID); err != nil {
		logrus.Error(fmt.Errorf("invalid user id: %s", userID))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	spamEmails, err := h.queries.ListSpamEmails(r.Context(), uid)
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			logrus.Error(fmt.Errorf("failed to fetch tasks from database: %w", err))
		}
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if err := json.NewEncoder(w).Encode(spamEmails); err != nil {
		logrus.Error(fmt.Errorf("failed to encode tasks output: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	return
}

func (h *Handler) GetSpam(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	var spamID pgtype.UUID
	if err := spamID.Scan(vars["id"]); err != nil {
		logrus.Error(fmt.Errorf("invalid task id: %s", vars["id"]))
		return
	}

	spamEmail, err := h.queries.GetSpamEmail(r.Context(), spamID)
	if err != nil {
		logrus.Error(fmt.Errorf("failed to fetch spam email from database: %w", err))
		return
	}

	if err := json.NewEncoder(w).Encode(spamEmail); err != nil {
		logrus.Error(fmt.Errorf("failed to encode tasks output: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	return
}

func (h *Handler) MoveSpam(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	var spamID pgtype.UUID
	if err := spamID.Scan(vars["id"]); err != nil {
		logrus.Error(fmt.Errorf("invalid task id: %s", vars["id"]))
		return
	}

	spamEmail, err := h.queries.GetSpamEmail(r.Context(), spamID)
	if err != nil {
		logrus.Error(fmt.Errorf("failed to fetch spam email from database: %w", err))
		return
	}

	user, err := h.queries.GetUser(r.Context(), spamEmail.UserID)
	if err != nil {
		logrus.Error(fmt.Errorf("failed to fetch user from database: %w", err))
		return
	}

	cred := mstoken.NewStaticTokenCredential(user.Token)
	client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
	if err != nil {
		logrus.Error(fmt.Errorf("failed to create graph client: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	requestBody := graphusers.NewItemMailfoldersItemMessagesItemMovePostRequestBody()
	inboxFolderID := "inbox"
	requestBody.SetDestinationId(&inboxFolderID)
	newMessage, err := client.Me().Messages().ByMessageId(*spamEmail.MessageID).Move().Post(r.Context(), requestBody, nil)
	if err != nil {
		logrus.Errorf("Failed to move message to back to inbox, error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	// After we move the message back to Inbox, we need to skip checking this email because it has been falsely detected as spam
	// For now we temporarily store the message ID into memory map. This is not going to work in HA but don't worry about it now.
	subscribe.SkipEmails[*newMessage.GetId()] = struct{}{}

	logrus.Infof("Move spam email %s to %s", *spamEmail.MessageID, inboxFolderID)

	if err := h.queries.DeleteSpamEmail(r.Context(), spamID); err != nil {
		logrus.Error(fmt.Errorf("failed to delete task: %w", err))
		return
	}
	w.WriteHeader(http.StatusOK)
	return
}

func (h *Handler) DeleteSpam(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	var spamID pgtype.UUID
	if err := spamID.Scan(vars["id"]); err != nil {
		logrus.Error(fmt.Errorf("invalid task id: %s", vars["id"]))
		return
	}

	if err := h.queries.DeleteSpamEmail(r.Context(), spamID); err != nil {
		logrus.Error(fmt.Errorf("failed to delete task: %w", err))
		return
	}
	w.WriteHeader(http.StatusOK)
	return
}
