package task

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"slices"
	"strings"
	"time"

	"ethan/pkg/db"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/gptscript-ai/go-gptscript"
	"github.com/gptscript-ai/gptscript/pkg/runner"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/sirupsen/logrus"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = 10 * time.Second
	toolCallHeader = "<tool call>"
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
	// todo
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

func (h *Handler) RunTask(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithCancel(r.Context())

	userID := r.Header.Get("X-User-ID")
	var uid pgtype.UUID
	if err := uid.Scan(userID); err != nil {
		logrus.Error(fmt.Errorf("invalid user id: %s", userID))
		return
	}

	vars := mux.Vars(r)
	var taskID pgtype.UUID
	if err := taskID.Scan(vars["id"]); err != nil {
		logrus.Error(fmt.Errorf("invalid task id: %s", userID))
		return
	}

	task, err := h.queries.GetTask(ctx, taskID)
	if err != nil {
		logrus.Error(fmt.Errorf("failed to fetch task from database: %w", err))
		return
	}

	user, err := h.queries.GetUser(ctx, uid)
	if err != nil {
		logrus.Error(fmt.Errorf("failed to fetch user: %w", err))
		return
	}

	client, err := gptscript.NewGPTScript(gptscript.GlobalOptions{
		OpenAIAPIKey: os.Getenv("OPENAI_API_KEY"),
		Env:          append(os.Environ(), fmt.Sprintf("GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN=%v", user.Token)),
	})
	if err != nil {
		logrus.Error(fmt.Errorf("failed to create gptscript client: %w", err))
		return
	}
	defer client.Close()

	var upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logrus.Error(fmt.Errorf("failed to upgrade connection: %w", err))
		return
	}
	defer conn.Close()

	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error { conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })

	run, err := client.Run(ctx, "./copilot.gpt", gptscript.Options{
		Prompt:        true,
		IncludeEvents: true,
		ChatState:     string(task.State),
	})
	if err != nil {
		logrus.Error(fmt.Errorf("failed to run gptscript within task: %w", err))
		return
	}
	defer run.Close()

	go ping(conn, run, cancel)

	for {
		select {
		case <-ctx.Done():
			logrus.Infof("Context cancel, returning")
			return
		default:
			for event := range run.Events() {
				if event.Call != nil {
					message := struct {
						ID    string                         `json:"id"`
						Frame gptscript.CallFrame            `json:"frame"`
						State map[string]gptscript.CallFrame `json:"state"`
					}{
						ID:    event.Call.ID,
						Frame: *event.Call,
						State: run.Calls(),
					}

					data, err := json.Marshal(message)
					if err != nil {
						logrus.Error(fmt.Errorf("failed to marshal message to write: %w", err))
						w.WriteHeader(http.StatusInternalServerError)
						return
					}

					if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
						logrus.Error(fmt.Errorf("failed to write message to client: %w", err))
						return
					}
				}
			}

			if run.State() == gptscript.Finished {
				if err := h.queries.UpdateTaskStateToNull(ctx, taskID); err != nil {
					logrus.Error(fmt.Errorf("failed to update task state: %w", err))
					return
				}
			} else {
				if run.ChatState() != "" {
					param := db.UpdateTaskStateParams{
						ID:    taskID,
						State: []byte(run.ChatState()),
					}
					if err := h.queries.UpdateTaskState(ctx, param); err != nil {
						logrus.Error(fmt.Errorf("failed to update task state: %w", err))
						return
					}
				}
			}

			if task.ConversationID == nil && run.ChatState() != "" {
				var ret runner.State
				if err := json.Unmarshal([]byte(run.ChatState()), &ret); err != nil {
					logrus.Error(fmt.Errorf("failed to unmarshal state: %w", err))
					return
				}
				if ret.Continuation != nil && ret.Continuation.State != nil {
					for _, r := range ret.Continuation.State.Results {
						if r.ToolID == "copilot.gpt:send-email" {
							var out struct {
								MessageID      string `json:"messageId"`
								ConversationID string `json:"conversationId"`
							}
							if err := json.Unmarshal([]byte(r.Result), &out); err != nil {
								logrus.Error(fmt.Errorf("failed to unmarshal result: %w", err))
								return
							}

							if err := h.queries.UpdateTaskConversationID(ctx, db.UpdateTaskConversationIDParams{
								ID:             taskID,
								ConversationID: &out.ConversationID,
							}); err != nil {
								logrus.Error(fmt.Errorf("failed to update task conversation: %w", err))
								return
							}
							task.ConversationID = &out.ConversationID
						}
					}
				}
			}

			messageType, m, err := conn.ReadMessage()
			if err != nil {
				logrus.Error(fmt.Errorf("failed to read websocket message: %w", err))
				return
			}

			switch messageType {
			case websocket.TextMessage:
				run, err = run.NextChat(ctx, string(m))
				if err != nil {
					logrus.Error(fmt.Errorf("failed to run NextChat: %w", err))
					return
				}
			case websocket.CloseMessage:
				return
			default:
				log.Println("Received unknown message type")
				return
			}
		}

	}
}

func ping(conn *websocket.Conn, run *gptscript.Run, cancel context.CancelFunc) {
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				if errors.Is(err, websocket.ErrCloseSent) {
					run.Close()
					cancel()
				}
				return
			}
		}
	}
}

func render(run *gptscript.Run) string {
	buf := &strings.Builder{}

	if call, ok := run.ParentCallFrame(); ok {
		printCall(buf, call, nil)
	}

	return buf.String()
}

func printCall(buf *strings.Builder, call gptscript.CallFrame, stack []string) {
	if slices.Contains(stack, call.ID) {
		return
	}

	for _, output := range call.Output {
		content, _, _ := strings.Cut(output.Content, toolCallHeader)
		if content != "" {
			if strings.HasPrefix(call.Tool.Instructions, "#!") {
				buf.WriteString(strings.TrimSpace(content))
			} else {
				buf.WriteString(content)
			}
		}
	}
}
