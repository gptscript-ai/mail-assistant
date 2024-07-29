# Copilot Assistant

Copilot Assistant is a chat App that help you to schedule meeting, managing tasks through Chat bot in your O365 account. It provides several tools to help you find other people's availability, sending emails to check their available time and send invites to other person's calendar.

## How to run

Copilot Assistant integrates with microsoft to assist you with office tasks. 

The first step is to create an [App Registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app?tabs=certificate) in Microsoft Azure and register it inside the app.

App Registration allows microsoft to perform identity check and issue access token on your behave to perform certain task with permissions.

### Create Microsoft App Registration

Follow [instruction](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app?tabs=certificate) here.

Make sure Redirect URL is configured to `http://localhost:8080`. 

This makes sure Microsoft will redirect to localhost server(which is where Copilot server listens to) and complete Oauth workflow.

After creating the app, [create a secret](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app?tabs=certificate#add-credentials) and copy the secret value.

Make sure you obtain the following values that are needed in the next step

| Key           | Value            | Description             |
|---------------|------------------|-------------------------|
| CLIENT_ID     | ${CLIENT_ID}     | Microsoft client id     |
| CLIENT_SECRET | ${CLIENT_SECRET} | Microsoft client secret |
| TENANT_ID     | ${TENANT_ID}     | Microsoft tenant id     |

### Prepare other environment variables.

| Key               | Value                | Description                                                                                                                                                                                                                                                                                                                             |
|-------------------|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| OPENAI_API_KEY    | ${OPENAI_API_KEY}    | Provide your OPENAI_API_KEY.                                                                                                                                                                                                                                                                                                            |
| MICROSOFT_JWT_KEY | ${MICROSOFT_JWT_KEY} | Provide a secret value used as JWT KEY. This is used to sign JWT token issued on behalf of a user.  Keep this as a secret. You can use `openssl rand -base64 32` to generate a random value for it.                                                                                                                                     |                                                                                       
| PUBLIC_URL        | ${PUBLIC_URL}        | This is required for webhook notification to work. Since everything is running locally, you need to expose your APP server publicly so that webhook event can be delivered into the App.  The easiest way is to run `ngrok`. Check Docs on (ngrok)[https://ngrok.com/docs/getting-started/] on how to forward your local port publicly. |

### Running the App with docker compose

```bash
git clone https://github.com/StrongMonkey/ethan.git
cd ethan
```

Replace .env placeholder with the values you have in previous step.

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

Then run docker-compose
```bash
docker compose -f docker-compose-local.yaml up
```

Go to `http://localhost:8080` and you can start login and using the App.
