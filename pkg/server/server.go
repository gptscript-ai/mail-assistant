package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	"ethan/pkg/db"
	"ethan/pkg/server/auth"
	"ethan/pkg/server/task"
	"github.com/gorilla/mux"
)

func main() {
	host := os.Getenv("PG_HOST")
	port := 5432
	user := os.Getenv("PG_USER")
	dbname := os.Getenv("PG_DBNAME")

	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s "+
		"dbname=%s sslmode=disable",
		host, port, user, dbname)

	// Open a connection to the database
	conn, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		log.Fatal("Error opening database connection: ", err)
	}
	defer conn.Close()

	queries := db.New(conn)

	authHandler := auth.NewHandler(queries)
	taskHandler := task.NewHandler(queries)

	r := mux.NewRouter()

	// Auth
	r.HandleFunc("/login", authHandler.HandleMicrosoftLogin)
	r.HandleFunc("/auth/callback", authHandler.HandleMicrosoftCallback)

	// Task
	r.HandleFunc("/tasks", auth.Middleware(taskHandler.ListTasks)).Methods(http.MethodGet)
	r.HandleFunc("/tasks", auth.Middleware(taskHandler.CreateTask)).Methods(http.MethodPost)

	r.HandleFunc("/tasks/{id}/run", auth.Middleware(taskHandler.RunTask))



	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}
