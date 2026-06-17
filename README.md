# Task Manager

A responsive task manager with a Node.js/Express REST API, local JSON persistence, and a vanilla JavaScript Kanban frontend.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Starts the production server. |
| `npm run dev` | Starts the server in Node watch mode. |
| `npm run lint` | Runs ESLint. |
| `npm run format` | Formats the project with Prettier. |
| `npm test` | Runs Jest, Supertest, and coverage. |

## API Reference

| Method | Endpoint | Description | Body |
| --- | --- | --- | --- |
| `GET` | `/api/tasks` | List tasks. Supports `status`, `priority`, `sortBy`, and `direction`. | None |
| `GET` | `/api/tasks/:id` | Get one task by id. | None |
| `POST` | `/api/tasks` | Create a task. | `title`, `description`, `status`, `priority`, `dueDate` |
| `PUT` | `/api/tasks/:id` | Update a task. | Any task input field |
| `PATCH` | `/api/tasks/:id` | Partially update a task. | Any task input field |
| `DELETE` | `/api/tasks/:id` | Delete a task. | None |

Task fields are `id`, `title`, `description`, `status`, `priority`, `dueDate`, `createdAt`, and `updatedAt`. The server owns IDs and timestamps.

## Environment Variables

| Name | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP server port. |
| `NODE_ENV` | unset | Hides stack traces when set to `production`. |
| `TASKS_FILE` | `data/tasks.json` | Local JSON file used for persistence. |

## Validation and Security

The API rejects unknown fields, validates every request body, strips HTML tags from string input, rate-limits `/api` routes to 100 requests per 15 minutes, and sends Helmet security headers.

## Contributing

Use commit messages in this format:

```text
feat|fix|chore|test|docs: short description
```

Before opening a pull request, run:

```bash
npm run lint
npm test
```
