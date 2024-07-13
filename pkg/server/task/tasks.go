package task

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"ethan/pkg/db"
	"ethan/pkg/tool"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/sirupsen/logrus"
)

const (
	writeWait          = 10 * time.Second
	pongWait           = 60 * time.Second
	pingPeriod         = 10 * time.Second
	toolCallHeader     = "<tool call>"
	taskContext        = "task-context"
	messageBodyContext = "message-body-context"
)

type Handler struct {
	queries *db.Queries
}

func NewHandler(queries *db.Queries) *Handler {
	return &Handler{queries: queries}
}

func (h *Handler) CreateTask(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var uid pgtype.UUID
	if err := uid.Scan(userID); err != nil {
		logrus.Error(fmt.Errorf("invalid user id: %s", userID))
		return
	}
	var taskParam db.CreateTaskParams
	data, err := io.ReadAll(r.Body)
	if err != nil {
		logrus.Error(fmt.Errorf("failed to fetch tasks from database: %w", err))
		return
	}
	if len(data) != 0 {
		if err := json.Unmarshal(data, &taskParam); err != nil {
			logrus.Error(fmt.Errorf("failed to unmarshal tasks from request body: %w", err))
			return
		}
	}
	taskParam.UserID = uid
	if taskParam.ToolDefinition == nil {
		taskParam.ToolDefinition = &tool.DefaultToolDef
	}
	task, err := h.queries.CreateTask(r.Context(), taskParam)
	if err != nil {
		logrus.Error(fmt.Errorf("failed to create task: %w", err))
		return
	}
	if err := json.NewEncoder(w).Encode(task); err != nil {
		logrus.Error(fmt.Errorf("failed to encode task output: %w", err))
		return
	}
	return
}

func (h *Handler) GetTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	var taskID pgtype.UUID
	if err := taskID.Scan(vars["id"]); err != nil {
		logrus.Error(fmt.Errorf("invalid task id: %s", vars["id"]))
		return
	}

	task, err := h.queries.GetTask(r.Context(), taskID)
	if err != nil {
		logrus.Error(fmt.Errorf("failed to unmarshal tasks from request body: %w", err))
		return
	}

	if err := json.NewEncoder(w).Encode(task); err != nil {
		logrus.Error(fmt.Errorf("failed to encode task output: %w", err))
		return
	}
	return
}

func (h *Handler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	var taskID pgtype.UUID
	if err := taskID.Scan(vars["id"]); err != nil {
		logrus.Error(fmt.Errorf("invalid task id: %s", vars["id"]))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	var taskParam db.UpdateTaskParams
	data, err := io.ReadAll(r.Body)
	if err != nil {
		logrus.Error(fmt.Errorf("failed to fetch tasks from database: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if len(data) != 0 {
		if err := json.Unmarshal(data, &taskParam); err != nil {
			logrus.Error(fmt.Errorf("failed to unmarshal tasks from request body: %w", err))
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}
	taskParam.ID = taskID

	if err := h.queries.UpdateTask(r.Context(), taskParam); err != nil {
		logrus.Error(fmt.Errorf("failed to update task: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	return
}

func (h *Handler) DeleteTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	var taskID pgtype.UUID
	if err := taskID.Scan(vars["id"]); err != nil {
		logrus.Error(fmt.Errorf("invalid task id: %s", vars["id"]))
		return
	}

	if err := h.queries.DeleteTask(r.Context(), taskID); err != nil {
		logrus.Error(fmt.Errorf("failed to delete task: %w", err))
		return
	}
	w.WriteHeader(http.StatusOK)
	return
}

func (h *Handler) ListTasks(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var uid pgtype.UUID
	if err := uid.Scan(userID); err != nil {
		logrus.Error(fmt.Errorf("invalid user id: %s", userID))
		return
	}
	tasks, err := h.queries.GetTaskFromUserID(r.Context(), uid)
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			logrus.Error(fmt.Errorf("failed to fetch tasks from database: %w", err))
		}
		return
	}
	if err := json.NewEncoder(w).Encode(tasks); err != nil {
		logrus.Error(fmt.Errorf("failed to encode tasks output: %w", err))
		return
	}
	return
}
