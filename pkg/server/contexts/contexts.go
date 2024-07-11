package contexts

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"ethan/pkg/db"
	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/sirupsen/logrus"
)

type Handler struct {
	queries *db.Queries
}

func NewHandler(queries *db.Queries) *Handler {
	return &Handler{queries: queries}
}

func (h *Handler) CreateContext(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var uid pgtype.UUID
	if err := uid.Scan(userID); err != nil {
		logrus.Error(fmt.Errorf("invalid user id: %s", userID))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	var contextParam db.CreateContextParams
	data, err := io.ReadAll(r.Body)
	if err != nil {
		logrus.Error(fmt.Errorf("failed to fetch tasks from database: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if len(data) != 0 {
		if err := json.Unmarshal(data, &contextParam); err != nil {
			logrus.Error(fmt.Errorf("failed to unmarshal tasks from request body: %w", err))
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}
	contextParam.UserID = uid

	context, err := h.queries.CreateContext(r.Context(), contextParam)
	if err != nil {
		logrus.Error(fmt.Errorf("failed to create context: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if err := json.NewEncoder(w).Encode(context); err != nil {
		logrus.Error(fmt.Errorf("failed to encode task output: %w", err))
		return
	}
	return
}

func (h *Handler) ListContext(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var uid pgtype.UUID
	if err := uid.Scan(userID); err != nil {
		logrus.Error(fmt.Errorf("invalid user id: %s", userID))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	contexts, err := h.queries.ListContextsForUser(r.Context(), uid)
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			logrus.Error(fmt.Errorf("failed to fetch tasks from database: %w", err))
		}
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if err := json.NewEncoder(w).Encode(contexts); err != nil {
		logrus.Error(fmt.Errorf("failed to encode tasks output: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	return
}

func (h *Handler) UpdateContext(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	var contextID pgtype.UUID
	if err := contextID.Scan(vars["id"]); err != nil {
		logrus.Error(fmt.Errorf("invalid task id: %s", vars["id"]))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	var contextParam db.UpdateContextParams
	data, err := io.ReadAll(r.Body)
	if err != nil {
		logrus.Error(fmt.Errorf("failed to fetch tasks from database: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if len(data) != 0 {
		if err := json.Unmarshal(data, &contextParam); err != nil {
			logrus.Error(fmt.Errorf("failed to unmarshal tasks from request body: %w", err))
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}
	contextParam.ID = contextID

	if err := h.queries.UpdateContext(r.Context(), contextParam); err != nil {
		logrus.Error(fmt.Errorf("failed to update task: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	return
}

func (h *Handler) DeleteContext(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	var contextID pgtype.UUID
	if err := contextID.Scan(vars["id"]); err != nil {
		logrus.Error(fmt.Errorf("invalid task id: %s", vars["id"]))
		return
	}

	if err := h.queries.DeleteContext(r.Context(), contextID); err != nil {
		logrus.Error(fmt.Errorf("failed to delete task: %w", err))
		return
	}
	w.WriteHeader(http.StatusOK)
	return
}
