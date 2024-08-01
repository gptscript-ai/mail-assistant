# Guide

First, you need to sign in to the app using Microsoft OAuth.

Click on the link to sign in, and you will be redirected to the Microsoft OAuth page, where you need to agree to grant permission to this app.

## Exploring the Dashboard

Once you are signed in, you will land on the Dashboard page. It mainly has two resources:

- **Tasks**

  Tasks allow you to create and manage tasks. Each task maintains its own chat session, helping you with some O365 tasks with the chatbot. It can be paused and resumed at any time, keeping the chat history and session.

- **Rule Sets**

  Rule sets allow you to define rules for each task. It is basically adding more context to the chat session. You can create a rule like "When meeting with X, always meet in the afternoon" and attach it to a task. When the task runs, it will remember the rule you gave when you interact with it.

## Creating Tasks

1. Click on `Tasks` on the left panel.
2. Click on `Add`. Fill in the name, description, and additional rules (if any).

:::note

You can attach pre-configured rule sets to your task.

:::

## Creating Rule Sets

You can create pre-configured rule sets and attach them to a task.

1. Click on `Rule Sets` on the left panel.
2. Click on `Add`.

## Running a Task

Simply click on the task name to start running a task in a chat session.

## Automatic Task Creation

The `Mail-Assistant` app watches your inbox and detects if other people want to meet with you. If so, it will automatically create a task and remind you that you can start scheduling a meeting with them.

You can see the notification from the app once a new task is created.

## Cold Email Detection

:::warning

This feature is currently experimental.

:::

`Mail-Assistant` can help you detect cold emails for marketing and move them to a `Cold Email` folder. To enable it:

1. Go to `Accounts` and enable `Cold Email Detection`.
2. Any email marked as a cold email will appear under `Cold Email`. You can move it back to the inbox if it has been falsely detected.
