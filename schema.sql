CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text  NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    refresh_token text NOT NULL,
    expire_at TIMESTAMPTZ
);

CREATE TABLE tasks (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid,
    state jsonb,
    CONSTRAINT fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
