-- name: GetUser :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: GetUserFromEmail :one
SELECT * FROM users
WHERE email = $1 LIMIT 1;

-- name: ListUsers :many
SELECT * FROM users
ORDER BY name;

-- name: CreateUser :one
INSERT INTO users (
    name, token, email, refresh_token, expire_at
) VALUES (
             $1, $2, $3, $4, $5
         )
RETURNING *;

-- name: UpdateUserToken :exec
UPDATE users
set token = $2,
    refresh_token = $3,
    expire_at = $4
WHERE id = $1;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;

-- name: GetTask :one
SELECT * FROM tasks
WHERE id = $1 LIMIT 1;

-- name: GetTaskFromUserID :many
SELECT * FROM tasks
WHERE user_id = $1;

-- name: ListTasks :many
SELECT * FROM tasks;

-- name: CreateTask :one
INSERT INTO tasks (
    user_id, state
) VALUES (
    $1, $2
)
RETURNING *;

-- name: UpdateTask :exec
UPDATE tasks
set state = $2
WHERE id = $1;

-- name: DeleteTask :exec
DELETE FROM tasks
WHERE id = $1;
