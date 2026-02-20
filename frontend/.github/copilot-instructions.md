# Copilot Instructions – Frontend Task Manager

This project is an Angular frontend that consumes a mock REST API at `http://localhost:3001` (json‑server).  
Use these guidelines when generating or modifying code.

---

## 1. Architecture & Project Structure

- Use **Angular feature-based structure** under `src/app/components` and `src/app/services`.
- Task management feature lives under:
  - `src/app/components/tasks/`
  - `src/app/services/task.service.ts`
  - `src/app/models/task.model.ts`
- Prefer **container + presentational components**:
  - Container: handles data fetching, orchestration (e.g. `TaskManagerComponent`).
  - Presentational: display & local logic (e.g. `TaskListComponent`, `TaskFormComponent`).

---

## 2. Data Model & Types

- Define and use a **Task interface** in one place:

```typescript
// filepath: /Users/riddhi/CopilotTest/frontend/src/app/models/task.model.ts
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id?: number;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string; // ISO string
}
```

- Always import `Task` and `TaskStatus` from this file in components and services.

---

## 3. HTTP & Services

- All HTTP communication with the mock API must go through a **single Angular service**:

```typescript
// filepath: /Users/riddhi/CopilotTest/frontend/src/app/services/task.service.ts
// Base URL is always:
private readonly baseUrl = 'http://localhost:3001/tasks';
```

- Implement **these methods** in `TaskService` using `HttpClient`:
  - `getTasks(options?: { status?: TaskStatus; sortByCreatedAtDesc?: boolean; page?: number; limit?: number; })`
  - `getTaskById(id: number)`
  - `createTask(payload: Omit<Task, 'id' | 'createdAt'>)`
  - `updateTask(id: number, task: Task)` (PUT)
  - `patchTask(id: number, partial: Partial<Task>)` (PATCH)
  - `deleteTask(id: number)`

- Always implement centralized **error handling**:

```typescript
private handleError(error: HttpErrorResponse) {
  let message = 'An unknown error occurred';
  if (error.error instanceof ErrorEvent) {
    message = `Network error: ${error.error.message}`;
  } else if (error.status === 0) {
    message = 'Cannot connect to server. Is the Mock API running on http://localhost:3001?';
  } else {
    message = `Server error ${error.status}: ${error.message}`;
  }
  return throwError(() => message);
}
```

- All service methods must use `pipe(catchError(this.handleError))`.

---

## 4. Forms – Use Reactive Forms Only

- Use **Reactive Forms** (`FormBuilder`, `FormGroup`, `FormControl`, `Validators`) for all Task create/edit UIs.
- `TaskFormComponent` is the **only component** responsible for create/edit forms.
- Form shape:

```typescript
this.form = this.fb.group({
  title: ['', [Validators.required, Validators.minLength(3)]],
  description: [''],
  status: ['todo', Validators.required]
});
```

- Rules:
  - Do **not** use `[(ngModel)]` in reactive forms.
  - Use `formControlName` in templates.
  - On form submit, call **TaskService**; do not call HttpClient directly from components.

---

## 5. UI Patterns & Layout

### 5.1 General UI Pattern

- Use a consistent pattern of:
  - **Container component**: fetches data, handles loading/error state, passes data + callbacks down.
  - **List component**: renders table/list items, emits events for edit/delete/status change.
  - **Form component**: handles validation and submit/cancel events.

### 5.2 Task Manager Page

- Main container: `TaskManagerComponent`
  - Shows:
    - Page title: `Task Manager`
    - Toolbar with:
      - "Add Task" button
      - Status filter `<select>` (`all`, `todo`, `in-progress`, `done`)
  - Beneath toolbar:
    - Optional error banner
    - Loading text or spinner (`"Loading tasks..."`)
    - `TaskFormComponent` in **create mode** (when "Add Task" clicked)
    - `TaskFormComponent` in **edit mode** (when "Edit" clicked)
    - `TaskListComponent` for the table

### 5.3 List View

- Use a **simple table layout**:

```html
<table *ngIf="tasks.length">
  <thead>
    <tr>
      <th>Title</th>
      <th>Description</th>
      <th>Status</th>
      <th>Created At</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <!-- rows -->
  </tbody>
</table>
```

- For each task row:
  - Always show: `title`, `description`, `status`, `createdAt`.
  - Use `date` pipe for `createdAt` (`| date: 'medium'`).
  - Status rendered as a text with CSS class equal to status (`todo`, `in-progress`, `done`).
  - Actions:
    - **Edit** button
    - **Delete** button (with confirmation `confirm(...)`)
    - Status `<select>` to change status, bound to `TaskStatus`.

### 5.4 Status Management

- Status is changed via a dropdown:

```html
<select
  [ngModel]="task.status"
  (ngModelChange)="changeStatus(task, $event)"
  [disabled]="isUpdatingStatus(task)">
  <option value="todo">Todo</option>
  <option value="in-progress">In Progress</option>
  <option value="done">Done</option>
</select>
```

- `changeStatus()` must call `TaskService.patchTask(id, { status })` and emit an event back to the container.

---

## 6. Async Handling & Error Feedback

- Use these **standard flags**:

In container components (e.g. TaskManager):

```typescript
isLoading = false;
errorMessage = '';
```

In form components:

```typescript
isSaving = false;
errorMessage = '';
```

In list components:

```typescript
deletingIds = new Set<number>();
updatingStatusIds = new Set<number>();
```

- Display patterns:
  - Loading:
    - `*ngIf="isLoading"` → show `"Loading tasks..."` or spinner.
  - Error:
    - `*ngIf="errorMessage"` → simple banner with red text.
  - Delete/status loading:
    - Disable buttons when operation in progress.
    - Button label changes like `"Deleting..."`.

- Do **not** swallow errors; always set an error message visible in the UI or show `alert(...)` as a fallback.

---

## 7. Routing & Navigation

- Use `TaskManagerComponent` for `/tasks` route:

```typescript
const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'health', component: HealthComponent },
  { path: 'tasks', component: TaskManagerComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', redirectTo: '/home' }
];
```

- Add a link to the Task Manager from the Home component:

```html
<a routerLink="/tasks">Go to Task Manager</a>
```

---

## 8. Styling Conventions

- Keep styles **minimal and consistent**:
  - Tables: full width, simple borders.
  - Forms: bordered card-style, margin bottom.
  - Errors: red text, small font.
- Example basic styles:

```css
/* Table */
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

th, td {
  padding: 0.5rem;
  border-bottom: 1px solid #ddd;
}

/* Status colors */
.todo {
  color: #1976d2;
}

.in-progress {
  color: #f57c00;
}

.done {
  color: #388e3c;
}

/* Form */
form {
  border: 1px solid #ddd;
  padding: 1rem;
  margin-bottom: 1rem;
}

.error {
  color: red;
  font-size: 0.85rem;
}
```

- Do not introduce new styling frameworks unless explicitly requested (e.g. Material, Bootstrap). Prefer plain CSS for now.

---

## 9. DO & DON’T Summary for Copilot

**Do:**

- Use **Reactive Forms** for all Task forms.
- Use **TaskService** for *all* API calls.
- Keep business logic in services, orchestration in containers, rendering in presentational components.
- Always handle loading and errors.
- Use `Task` and `TaskStatus` from the shared model.

**Don’t:**

- Don’t use `HttpClient` directly in components (always go through `TaskService`).
- Don’t mix `ngModel` and reactive forms on the same input.
- Don’t hardcode API URLs anywhere other than `TaskService`.
- Don’t create duplicate models or duplicate services for tasks.

---

Following these rules ensures a consistent, symmetric UI and architecture across the project.