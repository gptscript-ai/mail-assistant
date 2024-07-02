# Copilot Assistant

This is a full-stack APP that allows user to sign-in, create tasks and each task will help user schedule meetings.

## How to run

First, replace .env with your own open-api-key and client-secret.

```
DB_NAME=copilot
DB_USER=admin
DB_PASSWORD=admin123
DB_HOST=db

MICROSOFT_CLIENT_ID=761e7275-0044-4d3b-ad81-99f3dc8be936
OPENAI_API_KEY=you-openai-key
MICROSOFT_CLIENT_SECRET=client-secret
MICROSOFT_JWT_KEY=test
MICROSOFT_TENANT_ID=369895fd-4335-4606-b433-6ab084d5bd79

PUBLIC_URL=https://7810-174-72-112-87.ngrok-free.app
UI_SERVER=http://ui:3000
#UI_SERVER=http://host.docker.internal:3000
```

Then run docker-compose
```bash
docker-compose up
```

Go to `http://localhost:8080`.

Note: you need to set up PUBLIC_URL(ngrok) to make subscription-based notification work. It requires webhook event to be delivered to a public accessible address.
