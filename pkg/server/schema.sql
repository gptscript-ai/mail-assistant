CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text  NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    subscription_id text,
    subscription_expire_at TIMESTAMPTZ,
    expire_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tasks (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    user_id uuid,
    conversation_id text,
    state jsonb,
    CONSTRAINT fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id text UNIQUE,
    task_id uuid,
    content text,
    user_id uuid,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    read boolean DEFAULT false,
    CONSTRAINT fk_task_id
        FOREIGN KEY (task_id)
        REFERENCES tasks(id)
        ON DELETE CASCADE
    );
