package main

import (
	"context"
	_ "embed"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"

	"ethan/pkg/db"
	"ethan/pkg/server/auth"
	"ethan/pkg/server/contexts"
	"ethan/pkg/server/message"
	"ethan/pkg/server/subscribe"
	"ethan/pkg/server/task"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/sirupsen/logrus"
)

//go:embed schema.sql
var initSql string

func main() {
	host := os.Getenv("PG_HOST")
	port := 5432
	user := os.Getenv("PG_USER")
	dbname := os.Getenv("PG_DBNAME")
	password := os.Getenv("PG_PASSWORD")

	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s "+
		"dbname=%s sslmode=disable",
		host, port, user, dbname)

	if password != "" {
		psqlInfo += " password=" + password
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, psqlInfo)
	if err != nil {
		log.Fatal("Error opening database connection: ", err)
	}
	defer pool.Close()

	queries := db.New(pool)

	logrus.Infof("Running db init script")
	if _, err := pool.Exec(ctx, initSql); err != nil {
		log.Fatal(err)
	}

	go subscribe.PerUser(ctx, queries)
	go auth.RefreshToken(ctx, queries)

	authHandler := auth.NewHandler(queries)
	taskHandler := task.NewHandler(queries)
	contextHandler := contexts.NewHandler(queries)
	subscribeHandler := subscribe.NewHandler(queries)
	messageHandler := message.NewHandler(queries)

	target, err := url.Parse(os.Getenv("UI_SERVER"))
	if err != nil {
		log.Fatal(err)
	}

	// Set up the reverse proxy
	proxy := httputil.NewSingleHostReverseProxy(target)

	r := mux.NewRouter()
	apiRouter := r.PathPrefix("/api").Subrouter()

	// Auth
	apiRouter.HandleFunc("/login", authHandler.HandleMicrosoftLogin)
	apiRouter.HandleFunc("/auth/callback", authHandler.HandleMicrosoftCallback)

	// Webhook
	apiRouter.HandleFunc("/webhook", subscribeHandler.Subscribe)

	// Me
	apiRouter.HandleFunc("/me", auth.Middleware(authHandler.HandleMe))

	// Task
	apiRouter.HandleFunc("/tasks", auth.Middleware(taskHandler.ListTasks)).Methods(http.MethodGet)
	apiRouter.HandleFunc("/tasks", auth.Middleware(taskHandler.CreateTask)).Methods(http.MethodPost)
	apiRouter.HandleFunc("/tasks/{id}", auth.Middleware(taskHandler.GetTask)).Methods(http.MethodGet)
	apiRouter.HandleFunc("/tasks/{id}", auth.Middleware(taskHandler.UpdateTask)).Methods(http.MethodPost)
	apiRouter.HandleFunc("/tasks/{id}", auth.Middleware(taskHandler.DeleteTask)).Methods(http.MethodDelete)
	apiRouter.HandleFunc("/tasks/{id}/run", auth.Middleware(taskHandler.RunTask))

	// Context
	apiRouter.HandleFunc("/contexts", auth.Middleware(contextHandler.ListContext)).Methods(http.MethodGet)
	apiRouter.HandleFunc("/contexts", auth.Middleware(contextHandler.CreateContext)).Methods(http.MethodPost)
	apiRouter.HandleFunc("/contexts/{id}", auth.Middleware(contextHandler.UpdateContext)).Methods(http.MethodPost)
	apiRouter.HandleFunc("/contexts/{id}", auth.Middleware(contextHandler.DeleteContext)).Methods(http.MethodDelete)

	// Messages
	apiRouter.HandleFunc("/messages", auth.Middleware(messageHandler.ListMessages)).Methods(http.MethodGet)
	apiRouter.HandleFunc("/messages/{id}", auth.Middleware(messageHandler.UpdateMessage)).Methods(http.MethodPost)

	r.PathPrefix("/").Handler(proxy)

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}
