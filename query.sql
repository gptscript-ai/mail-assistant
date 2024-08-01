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
    name, token, refresh_token, email, expire_at
) VALUES (
             $1, $2, $3, $4, $5
         )
RETURNING *;

-- name: UpdateUser :exec
UPDATE users
set token = $2,
    refresh_token = $3,
    expire_at = $4,
    subscription_id = $5,
    subscription_expire_at = $6,
    subscription_disabled = $7,
    check_spam = $8
WHERE id = $1;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;

-- name: GetTask :one
SELECT * FROM tasks
WHERE id = $1 LIMIT 1;

-- name: GetTaskFromUserID :many
SELECT * FROM tasks
WHERE user_id = $1 ORDER BY created_at DESC;

-- name: GetTaskFromConversationID :one
SELECT * FROM tasks
WHERE conversation_id = $1 LIMIT 1;

-- name: CreateTask :one
INSERT INTO tasks (
    user_id, name, state, description, tool_definition, context, message_id, message_body, context_ids
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
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

-- name: UpdateTask :exec
UPDATE tasks
SET name = $2,
    description = $3,
    context = $4,
    context_ids = $5
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
WHERE user_id = $1 ORDER BY created_at DESC;

-- name: GetMessageFromUserIDAndTaskID :many
SELECT * FROM messages
WHERE user_id = $1 and task_id = $2 ORDER BY created_at DESC;

-- name: UpdateMessageRead :exec
UPDATE messages
set read = $2
WHERE id = $1;

-- name: CreateContext :one
INSERT INTO contexts (
    name, description, content, user_id
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: ListContextsForUser :many
SELECT * FROM contexts WHERE user_id = $1 ORDER BY created_at DESC;

-- name: UpdateContext :exec
UPDATE contexts
SET name = $2,
    description = $3,
    content = $4
WHERE id = $1;

-- name: DeleteContext :exec
DELETE FROM contexts
WHERE id = $1;

-- name: GetContext :one
SELECT * FROM contexts
WHERE id = $1 LIMIT 1;

-- name: CreateSpamEmailRecord :exec
INSERT INTO spam_emails (
    subject, email_body, user_id, message_id
) VALUES (
    $1, $2, $3, $4
);

-- name: ListSpamEmails :many
SELECT * FROM spam_emails WHERE user_id = $1;

-- name: GetSpamEmail :one
SELECT * FROM spam_emails WHERE id = $1;

-- name: DeleteSpamEmail :exec
DELETE FROM spam_emails WHERE id = $1;


