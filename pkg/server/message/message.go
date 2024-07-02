package message

import (
	"encoding/json"
	"fmt"
	"net/http"

	"ethan/pkg/db"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/sirupsen/logrus"
)

type Handler struct {
	queries *db.Queries
}

func NewHandler(queries *db.Queries) *Handler {
	return &Handler{queries: queries}
}

func (h *Handler) ListMessages(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var uID pgtype.UUID
	if err := uID.Scan(userID); err != nil {
		logrus.Error(fmt.Errorf("invalid task id: %s", userID))
		return
	}

	messages, err := h.queries.GetMessageFromUserID(r.Context(), uID)
	if err != nil {
		logrus.Error(fmt.Errorf("GetMessageFromUserID err: %v", err))
		return
	}

	if err := json.NewEncoder(w).Encode(messages); err != nil {
		logrus.Error(fmt.Errorf("json encode err: %v", err))
		return
	}

	return
}

func (h *Handler) UpdateMessage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	var messageID pgtype.UUID
	if err := messageID.Scan(vars["id"]); err != nil {
		logrus.Error(fmt.Errorf("invalid task id: %s", vars["id"]))
		return
	}

	if err := h.queries.UpdateMessageRead(r.Context(), db.UpdateMessageReadParams{
		ID:   messageID,
		Read: &[]bool{true}[0],
	}); err != nil {
		logrus.Error(fmt.Errorf("UpdateMessage err: %v", err))
		return
	}
	return
}
