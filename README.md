# Copilot Assistant

Copilot Assistant is a chat app that helps you schedule meetings and manage tasks through a chatbot in your O365 account. It provides several tools to help you find other people's availability, send emails to check their available times, and send invites to other people's calendars.

## How to Run

Copilot Assistant integrates with Microsoft to assist you with office tasks.

The first step is to create an [App Registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app?tabs=certificate) in Microsoft Azure and register it inside the app.

App Registration allows Microsoft to perform identity checks and issue access tokens on your behalf to perform certain tasks with permissions.

### Create Microsoft App Registration

Follow the [instructions](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app?tabs=certificate) here.

Make sure the Redirect URL is configured to `http://localhost:8080`.

This ensures Microsoft will redirect to the localhost server (which is where the Copilot server listens) and complete the OAuth workflow.

After creating the app, [create a secret](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app?tabs=certificate#add-credentials) and copy the secret value.

Make sure you obtain the following values that are needed in the next step:

| Key           | Value            | Description             |
|---------------|------------------|-------------------------|
| CLIENT_ID     | ${CLIENT_ID}     | Microsoft client ID     |
| CLIENT_SECRET | ${CLIENT_SECRET} | Microsoft client secret |
| TENANT_ID     | ${TENANT_ID}     | Microsoft tenant ID     |

### Prepare Other Environment Variables

| Key               | Value                | Description                                                                                                                                                                                                                                                                                                                             |
|-------------------|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| OPENAI_API_KEY    | ${OPENAI_API_KEY}    | Provide your OPENAI_API_KEY.                                                                                                                                                                                                                                                                                                            |
| MICROSOFT_JWT_KEY | ${MICROSOFT_JWT_KEY} | Provide a secret value used as a JWT key. This is used to sign JWT tokens issued on behalf of a user. Keep this a secret. You can use `openssl rand -base64 32` to generate a random value for it.                                                                                                                                     |                                                                                       
| PUBLIC_URL        | ${PUBLIC_URL}        | This is required for webhook notifications to work. Since everything is running locally, you need to expose your app server publicly so that webhook events can be delivered to the app. The easiest way is to run `ngrok`. Check the docs on [ngrok](https://ngrok.com/docs/getting-started/) on how to forward your local port publicly. |

### Running the App with Docker Compose

```bash
git clone https://github.com/StrongMonkey/ethan.git
cd ethan
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
docker compose -f docker-compose-local.yaml up
```

Go to `http://localhost:8080` and you can start logging in and using the app.

---
