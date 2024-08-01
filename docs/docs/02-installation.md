# Installation

### Create Microsoft App Registration

Follow the [instructions](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app?tabs=certificate) here.

After creating the app, [create a secret](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app?tabs=certificate#add-credentials) and copy the secret value.

Make sure you obtain the following values that are needed in the next step:

| Key           | Description             |
|---------------|-------------------------|
| CLIENT_ID     | Microsoft client ID     |
| CLIENT_SECRET | Microsoft client secret |
| TENANT_ID     | Microsoft tenant ID     |

:::note

Make sure the Redirect URL is configured to `http://localhost:8080`. This ensures Microsoft will redirect to the localhost server (which is where the Copilot server listens) and complete the OAuth workflow.

:::

### Prepare Other Environment Variables

| Key               | Description                                                                                                               |
|-------------------|---------------------------------------------------------------------------------------------------------------------------|
| OPENAI_API_KEY    | Provide your OPENAI_API_KEY.                                                                                              |
| MICROSOFT_JWT_KEY | Provide a secret value used as a JWT key. This is used to sign JWT tokens issued on behalf of a user. Keep this a secret. |                                                                                       
| PUBLIC_URL        | Public URL that your local server is listening to.                                                                        |

:::note

Since everything is running locally, you need to expose your app server publicly so that webhook events can be delivered to the app. The easiest way is to run `ngrok`. Check the docs on [ngrok](https://ngrok.com/docs/getting-started/) on how to forward your local port publicly.

:::

:::note

You can use `openssl rand -base64 32` to generate a random value for the JWT secret key.

:::

### Running with Docker Compose

Use the docker-compose file below with the .env file.

```yaml
version: '3.8'

services:
  db:
    image: postgres:12-alpine
    container_name: postgres_db
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    env_file:
      - .env
    restart: always

  ui:
    image: "ghcr.io/gptscript-ai/mail-assistant/ui:latest"
    ports:
      - "3000"
    restart: always

  server:
    image: "ghcr.io/gptscript-ai/mail-assistant/server:latest"
    ports:
      - "8080:8080"
    restart: always
    environment:
      MICROSOFT_CLIENT_ID: ${MICROSOFT_CLIENT_ID}
      MICROSOFT_CLIENT_SECRET: ${MICROSOFT_CLIENT_SECRET}
      MICROSOFT_JWT_KEY: ${MICROSOFT_JWT_KEY}
      MICROSOFT_TENANT_ID: ${MICROSOFT_TENANT_ID}
      PG_DBNAME: ${DB_NAME}
      PG_HOST: ${DB_HOST}
      PG_USER: ${DB_USER}
      PG_PASSWORD: ${DB_PASSWORD}
      PUBLIC_URL: ${PUBLIC_URL}
      UI_SERVER: ${UI_SERVER}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      DEVELOPMENT: "true"
    env_file:
      - .env

volumes:
  db_data:
```

Replace the .env placeholder with the values you obtained in the previous step.

```
DB_NAME=copilot
DB_USER=admin
DB_PASSWORD=admin123
DB_HOST=db

MICROSOFT_CLIENT_ID=${CLIENT_ID}
OPENAI_API_KEY=${OPENAI_API_KEY}
MICROSOFT_CLIENT_SECRET=${CLIENT_SECRET}
MICROSOFT_JWT_KEY=${JWT_SECRET_KEY}
MICROSOFT_TENANT_ID=${TENANT_ID}

DEVELOPMENT=true

PUBLIC_URL=${PUBLIC_URL}
UI_SERVER=http://ui:3000
```

Then run docker-compose:

```bash
docker compose up -d
```

Go to `http://localhost:8080` and you can start logging in and using the app.

---

### Use Other LLM

The default model is `gpt-4o`. To use a different OpenAI model, update the `DEFAULT_MODEL` in the `.env` file.

To connect to an OpenAI-compatible local model server, such as llama.cpp, ollama, or Rubra's tool.cpp, update the `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `DEFAULT_MODEL` accordingly. For example:

```
OPENAI_API_KEY=sk-123
OPENAI_BASE_URL=http://host.docker.internal:1234/v1
DEFAULT_MODEL=rubra-meta-llama-3-8b-instruct.Q8_0.gguf
```
