package task

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"ethan/pkg/db"
	"ethan/pkg/server/connection"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/gptscript-ai/go-gptscript"
	"github.com/gptscript-ai/gptscript/pkg/runner"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/sirupsen/logrus"
)

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
		HashID:       uuid.UUID(user.ID.Bytes).String(),
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

	// Close websocket after 15 minutes to avoid using a stale token
	ctxWithtimeout, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()

	go func() {
		<-ctxWithtimeout.Done()
		logrus.Info("Connection timeout: closing the WebSocket connection")
		conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, "Session timed out"))
		conn.Close()
	}()

	taskIDString := uuid.UUID(taskID.Bytes).String()
	connection.SetConn(taskIDString, conn)
	defer connection.RemoveConn(taskIDString)

	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error { conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })

	tools, err := client.ParseTool(ctx, *task.ToolDefinition)
	if err != nil {
		logrus.Error(fmt.Errorf("failed to parse tool definition: %w", err))
		return
	}

	var toolDefs []gptscript.ToolDef
	for _, tool := range tools {
		toolRef := tool.ToolNode.Tool.ToolDef
		toolRef.Arguments = tool.ToolNode.Tool.Arguments
		toolDefs = append(toolDefs, toolRef)
	}

	if task.Context != nil {
		toolDefs[0].Instructions += "\n" + fmt.Sprintf("You are provided with the following rules: %v\n", *task.Context)
	}
	for _, contextID := range task.ContextIds {
		cont, err := h.queries.GetContext(ctx, contextID)
		if err != nil {
			logrus.Error(fmt.Errorf("failed to fetch context from database: %w", err))
			return
		}
		toolDefs[0].Instructions += "\n" + fmt.Sprintf("%v\n", *cont.Content)
	}

	toolDefs[0].Instructions += "\n" + fmt.Sprintf("Current user: %v\n", user.Name)
	toolDefs[0].Instructions += "\n" + fmt.Sprintf("Current time: %v\n", time.Now())

	if task.MessageBody != nil {
		toolDefs[0].Instructions += "\n" + fmt.Sprintf("You are provided with an existing email: %v\n", *task.MessageBody)
	}

	run, err := client.Evaluate(ctx, gptscript.Options{
		Prompt:        true,
		IncludeEvents: true,
		DisableCache:  true,
		ChatState:     string(task.State),
	}, toolDefs...)
	defer run.Close()

	writeLock := &sync.Mutex{}
	go ping(conn, run, writeLock, cancel)

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

					writeLock.Lock()
					if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
						logrus.Error(fmt.Errorf("failed to write message to client: %w", err))
						writeLock.Unlock()
						return
					}
					writeLock.Unlock()
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
						if r.ToolID == "inline:send-email" {
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

func ping(conn *websocket.Conn, run *gptscript.Run, lock *sync.Mutex, cancel context.CancelFunc) {
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			lock.Lock()
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				if errors.Is(err, websocket.ErrCloseSent) {
					run.Close()
					cancel()
				}
				lock.Unlock()
				return
			}
			lock.Unlock()
		}
	}
}
