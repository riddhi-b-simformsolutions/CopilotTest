# Frontend Setup

This folder contains a minimal Angular application for the AI-Assisted Developer Evaluation Test.

## Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- Angular CLI (install globally: `npm install -g @angular/cli`)

## Installation

```bash
cd frontend
npm install
```

## Running the Frontend

### Development Server

```bash
npm start
```

The Angular app will run on **http://localhost:4200**

Navigate to [http://localhost:4200](http://localhost:4200) in your browser. The application will automatically reload if you change any source files.

## For Frontend-Only Candidates

### Important: Use the Mock API

If you're working on frontend only, you **must** use the provided mock API:

1. **Start the Mock API first** (in a separate terminal):
   ```bash
   cd mock-api
   npm install
   npm start
   ```
   Mock API runs on **http://localhost:3001**

2. **Then start the frontend** (in another terminal):
   ```bash
   cd frontend
   npm start
   ```

3. **Configure your service** to use the Mock API base URL: `http://localhost:3001`

📘 **See [../mock-api/README.md](../mock-api/README.md) for full API documentation**

### Verify Mock API

Visit [http://localhost:3001/tasks](http://localhost:3001/tasks) to see the initial task structure.

## For Full-Stack Candidates

If you're implementing both backend and frontend:

1. **Start your backend** (in one terminal):
   ```bash
   cd backend
   npm run dev
   ```
   Backend runs on **http://localhost:3000**

2. **Start the frontend** (in another terminal):
   ```bash
   cd frontend
   npm start
   ```

3. **Configure your service** to use your backend API: `http://localhost:3000`

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── app.module.ts           # Main module
│   │   ├── app-routing.module.ts   # Routing configuration
│   │   ├── app.component.ts        # Root component
│   │   ├── app.component.html      # Root template
│   │   └── components/             # Feature components
│   │       ├── home/               # Home component
│   │       └── health/             # Health component
│   ├── index.html                  # Main HTML
│   ├── main.ts                     # Application entry point
│   └── styles.css                  # Global styles
├── angular.json                    # Angular configuration
├── package.json
└── tsconfig.json                   # TypeScript configuration
```

## What's Already Set Up

✅ Angular application bootstrap  
✅ Basic routing (Home and Health routes)  
✅ HttpClientModule imported (ready for API calls)  
✅ Component structure  
✅ Minimal global styles  

## For Your Implementation

You need to:
- Create a task management component
- Build forms for creating/editing tasks
- Create a service to handle API calls
- Implement proper error handling
- Add loading states for async operations
- Display tasks in a user-friendly way

## API Reference

### TaskService (`src/app/services/task.service.ts`)

Base URL: `http://localhost:3001/tasks`

| Method | HTTP | Endpoint | Offline? | Description |
|--------|------|----------|----------|-------------|
| `getTasks(options?)` | GET | `/tasks` | ✅ cached | Fetch all tasks with optional status filter, sort, and pagination. |
| `getTaskById(id)` | GET | `/tasks/:id` | ❌ | Fetch a single task by numeric ID. |
| `createTask(payload)` | POST | `/tasks` | ✅ queued | Create a new task; `createdAt` is set automatically. |
| `updateTask(id, task)` | PUT | `/tasks/:id` | ✅ queued | Full replacement of an existing task. |
| `patchTask(id, partial)` | PATCH | `/tasks/:id` | ✅ queued | Partial update — commonly used for status changes. |
| `deleteTask(id)` | DELETE | `/tasks/:id` | ✅ queued | Remove a task; mirrors deletion in the local cache. |
| `reorderTasks(tasks)` | — | local only | ✅ queued | Persist drag-and-drop order via the `priority` field. |

> **Offline behaviour**: when `navigator.onLine` is `false`, all write
> operations are queued in `LocalStorageService` as pending actions and
> replayed automatically by `OfflineService` when the connection is restored.

### Task model (`src/app/models/task.model.ts`)

```typescript
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id?: number;        // Assigned by the server (or temporarily by Date.now() offline)
  title: string;      // Required. Minimum 3 characters.
  description?: string;
  status: TaskStatus; // Required.
  createdAt: string;  // ISO 8601 timestamp, set automatically on creation.
  priority?: number;  // Zero-based drag-and-drop order (lower = displayed first).
}
```

## Available Scripts

- `npm start` - Start the development server
- `npm run build` - Build the project for production
- `npm test` - Execute unit tests (if implemented)

## Tips

- Use Angular's **Reactive Forms** for form handling
- Create a **service** to encapsulate all HTTP calls
- Use **TypeScript interfaces** for type safety
- Handle **loading and error states** in your components
- Keep components **focused and reusable**

Good luck! 🚀
