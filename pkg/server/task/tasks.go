package task

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"slices"
	"strings"
	"time"

	"ethan/pkg/db"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/gptscript-ai/go-gptscript"
	"github.com/sirupsen/logrus"
	"github.com/sqlc-dev/pqtype"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second * 100
	pingPeriod     = (pongWait * 9) / 10
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
	var uid uuid.NullUUID
	if err := uid.Scan(userID); err != nil {
		fmt.Fprint(w, fmt.Errorf("invalid user id: %s", userID))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	var taskParam db.CreateTaskParams
	data, err := io.ReadAll(r.Body)
	if err != nil {
		fmt.Fprint(w, fmt.Errorf("failed to fetch tasks from database: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if len(data) != 0 {
		if err := json.Unmarshal(data, &taskParam); err != nil {
			fmt.Fprint(w, fmt.Errorf("failed to unmarshal tasks from request body: %w", err))
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}
	taskParam.UserID = uid
	task, err := h.queries.CreateTask(r.Context(), taskParam)
	if err != nil {
		fmt.Fprint(w, fmt.Errorf("failed to create task: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if err := json.NewEncoder(w).Encode(task); err != nil {
		fmt.Fprint(w, fmt.Errorf("failed to encode task output: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	return
}

func (h *Handler) ListTasks(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var uid uuid.NullUUID
	if err := uid.Scan(userID); err != nil {
		fmt.Fprint(w, fmt.Errorf("invalid user id: %s", userID))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	tasks, err := h.queries.GetTaskFromUserID(r.Context(), uid)
	if err != nil {
		fmt.Fprint(w, fmt.Errorf("failed to fetch tasks from database: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if err := json.NewEncoder(w).Encode(tasks); err != nil {
		fmt.Fprint(w, fmt.Errorf("failed to encode tasks output: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	return
}

func (h *Handler) RunTask(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var uid uuid.NullUUID
	if err := uid.Scan(userID); err != nil {
		fmt.Fprint(w, fmt.Errorf("invalid user id: %s", userID))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	vars := mux.Vars(r)
	var taskID uuid.NullUUID
	if err := taskID.Scan(vars["id"]); err != nil {
		fmt.Fprint(w, fmt.Errorf("invalid task id: %s", userID))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	task, err := h.queries.GetTask(r.Context(), taskID.UUID)
	if err != nil {
		fmt.Fprint(w, fmt.Errorf("failed to fetch task from database: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	user, err := h.queries.GetUser(r.Context(), uid.UUID)
	if err != nil {
		fmt.Fprint(w, fmt.Errorf("failed to fetch user: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	client, err := gptscript.NewGPTScript(gptscript.GlobalOptions{
		OpenAIAPIKey: os.Getenv("OPENAI_API_KEY"),
		Env:          append(os.Environ(), fmt.Sprintf("GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN=%v", user.Token)),
	})
	if err != nil {
		fmt.Fprint(w, fmt.Errorf("failed to create gptscript client: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer client.Close()

	var upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Fprint(w, fmt.Errorf("failed to upgrade connection: %w", err))
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer conn.Close()

	go ping(conn)

	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error { conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })

	run, err := client.Run(r.Context(), "./copilot.gpt", gptscript.Options{
		Prompt:        true,
		IncludeEvents: true,
		ChatState:     string(task.State.RawMessage),
	})
	if err != nil {
		fmt.Fprint(w, fmt.Errorf("failed to run gptscript within task: %w", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer run.Close()

	for {
		for event := range run.Events() {
			if event.Call != nil {
				text := render(run)
				if text == "" {
					continue
				}
				if err := conn.WriteMessage(websocket.TextMessage, []byte(text)); err != nil {
					fmt.Fprint(w, fmt.Errorf("failed to write message to client: %w", err))
					w.WriteHeader(http.StatusInternalServerError)
					return
				}
			}
		}

		if run.State() == gptscript.Finished {
			if err := h.queries.UpdateTask(r.Context(), db.UpdateTaskParams{
				ID:    taskID.UUID,
				State: pqtype.NullRawMessage{},
			}); err != nil {
				fmt.Fprint(w, fmt.Errorf("failed to update task state: %w", err))
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
		} else {
			var state pqtype.NullRawMessage
			if err := state.Scan([]byte(run.ChatState())); err != nil {
				fmt.Fprint(w, fmt.Errorf("failed to scan state: %w", err))
				w.WriteHeader(http.StatusInternalServerError)
				return
			}

			if err := h.queries.UpdateTask(r.Context(), db.UpdateTaskParams{
				ID:    taskID.UUID,
				State: state,
			}); err != nil {
				fmt.Fprint(w, fmt.Errorf("failed to update task state: %w", err))
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
		}

		messageType, m, err := conn.ReadMessage()
		if err != nil {
			fmt.Fprint(w, fmt.Errorf("failed to read websocket message: %w", err))
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		switch messageType {
		case websocket.TextMessage:
			run, err = run.NextChat(r.Context(), string(m))
			if err != nil {
				fmt.Fprint(w, fmt.Errorf("failed to run NextChat: %w", err))
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
		case websocket.CloseMessage:
			logrus.Debugf("Close message received, closing websocket")
			return
		default:
			log.Println("Received unknown message type")
			return
		}
	}
}

func ping(conn *websocket.Conn) {
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Println("Error sending ping message:", err)
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
