-- name: GetUser :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: GetUserFromEmail :one
SELECT * FROM users
WHERE email = $1 LIMIT 1;

-- name: GetUserFromSubscriptionID :one
SELECT * FROM users
WHERE subscription_id = $1 LIMIT 1;

-- name: ListUsers :many
SELECT * FROM users
ORDER BY name;

-- name: CreateUser :one
INSERT INTO users (
    name, token, email, expire_at
) VALUES (
             $1, $2, $3, $4
         )
RETURNING *;

-- name: UpdateUser :exec
UPDATE users
set token = $2,
    expire_at = $3,
    subscription_id = $4
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

-- name: GetTaskFromConversationID :one
SELECT * FROM tasks
WHERE conversation_id = $1 LIMIT 1;

-- name: ListTasks :many
SELECT * FROM tasks;

-- name: CreateTask :one
INSERT INTO tasks (
    user_id, name, state, description
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: UpdateTaskState :exec
UPDATE tasks
set state = $2
WHERE id = $1;

-- name: UpdateTaskStateToNull :exec
UPDATE tasks
set state = null
WHERE id = $1;

-- name: UpdateTaskConversationID :exec
UPDATE tasks
set conversation_id = $2
WHERE id = $1;

-- name: DeleteTask :exec
DELETE FROM tasks
WHERE id = $1;

-- name: CreateMessage :exec
INSERT INTO messages (
    message_id, task_id, content, user_id
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: GetMessageFromMessageID :one
SELECT * FROM messages
WHERE message_id = $1 LIMIT 1;

-- name: GetMessageFromUserID :many
SELECT * FROM messages
WHERE user_id = $1;

-- name: UpdateMessageRead :exec
UPDATE messages
set read = $2
WHERE id = $1;
