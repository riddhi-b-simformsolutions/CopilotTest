import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Task, TaskStatus } from '../models/task.model';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly baseUrl = 'http://localhost:3001/tasks';

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {}

  /**
   * Fetches all tasks, with optional filtering, sorting, and pagination.
   *
   * When offline, returns tasks from the local cache (localStorage),
   * applying any requested status filter and sorting by `priority` field
   * (drag-and-drop order) or `createdAt` when priorities are absent.
   * When online, queries the json-server API and refreshes the local cache
   * with the response.
   *
   * @param options - Optional query parameters.
   * @param options.status - Filter tasks by status (`todo`, `in-progress`, or `done`).
   * @param options.sortByCreatedAtDesc - When `true` and online, sorts by `createdAt` descending.
   * @param options.page - Page number for pagination (maps to `_page` on the API).
   * @param options.limit - Number of results per page (maps to `_limit` on the API).
   * @returns Observable emitting an array of `Task` objects.
   * @throws String error message via `throwError()` on HTTP failure.
   *
   * @example
   * ```typescript
   * this.taskService.getTasks({ status: 'todo', sortByCreatedAtDesc: true })
   *   .subscribe(tasks => this.tasks = tasks);
   * ```
   */
  getTasks(options?: {
    status?: TaskStatus;
    sortByCreatedAtDesc?: boolean;
    page?: number;
    limit?: number;
  }): Observable<Task[]> {
    // If offline, return cached tasks
    if (!navigator.onLine) {
      let tasks = this.localStorageService.getTasks();
      
      // Apply filters
      if (options?.status) {
        tasks = tasks.filter(task => task.status === options.status);
      }
      
      // Sort by priority for drag-and-drop order, then by createdAt
      tasks.sort((a, b) => {
        if (a.priority !== undefined && b.priority !== undefined) {
          return a.priority - b.priority;
        }
        if (options?.sortByCreatedAtDesc) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      
      return of(tasks);
    }

    // Online - fetch from API
    let params = new HttpParams();

    if (options?.status) {
      params = params.set('status', options.status);
    }
    if (options?.sortByCreatedAtDesc) {
      params = params.set('_sort', 'createdAt').set('_order', 'desc');
    }
    if (options?.page) {
      params = params.set('_page', options.page);
    }
    if (options?.limit) {
      params = params.set('_limit', options.limit);
    }

    return this.http.get<Task[]>(this.baseUrl, { params }).pipe(
      map(tasks => {
        // Cache tasks locally
        this.localStorageService.saveTasks(tasks);
        return tasks;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Fetches a single task by its numeric ID.
   *
   * Always makes a live HTTP GET request — no offline fallback.
   *
   * @param id - The numeric identifier of the task to retrieve.
   * @returns Observable emitting the matching `Task` object.
   * @throws String error message via `throwError()` on HTTP failure or 404.
   *
   * @example
   * ```typescript
   * this.taskService.getTaskById(42).subscribe(task => this.task = task);
   * ```
   */
  getTaskById(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.baseUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Creates a new task, automatically stamping `createdAt` with the current
   * ISO timestamp and assigning a temporary numeric `id`.
   *
   * When offline, stores the task in localStorage and queues a `create`
   * pending action for later sync. When online, POSTs to the API and
   * replaces the temporary `id` with the server-assigned one in the cache.
   *
   * @param payload - Task data excluding `id` and `createdAt` (both are set internally).
   * @returns Observable emitting the created `Task` (with real `id` when online,
   *   temporary `id` when offline).
   * @throws String error message via `throwError()` on HTTP failure.
   *
   * @example
   * ```typescript
   * this.taskService.createTask({ title: 'Fix bug', status: 'todo' })
   *   .subscribe(task => this.tasks.push(task));
   * ```
   */
  createTask(payload: Omit<Task, 'id' | 'createdAt'>): Observable<Task> {
    const body: Task = {
      ...payload,
      createdAt: new Date().toISOString(),
      id: Date.now() // Temporary ID for offline mode
    };

    // If offline, store locally and add to pending actions
    if (!navigator.onLine) {
      this.localStorageService.addTask(body);
      this.localStorageService.addPendingAction({
        type: 'create',
        task: body
      });
      return of(body);
    }

    // Online - create via API
    const { id, ...createPayload } = body; // Remove temp ID for API
    return this.http.post<Task>(this.baseUrl, createPayload).pipe(
      map(task => {
        // Update local storage with real ID
        this.localStorageService.addTask(task);
        return task;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Fully replaces an existing task (HTTP PUT).
   *
   * When offline, updates the local cache and queues an `update` pending
   * action for later sync. When online, sends the full task object to the
   * API and refreshes the cache with the server response.
   *
   * @param id - The numeric identifier of the task to update.
   * @param task - The complete `Task` object with updated values.
   * @returns Observable emitting the updated `Task`.
   * @throws String error message via `throwError()` on HTTP failure.
   *
   * @example
   * ```typescript
   * this.taskService.updateTask(task.id!, updatedTask)
   *   .subscribe(saved => Object.assign(task, saved));
   * ```
   */
  updateTask(id: number, task: Task): Observable<Task> {
    // If offline, store locally and add to pending actions
    if (!navigator.onLine) {
      this.localStorageService.updateTask(task);
      this.localStorageService.addPendingAction({
        type: 'update',
        task: task
      });
      return of(task);
    }

    return this.http.put<Task>(`${this.baseUrl}/${id}`, task).pipe(
      map(updatedTask => {
        this.localStorageService.updateTask(updatedTask);
        return updatedTask;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Partially updates an existing task (HTTP PATCH).
   *
   * Commonly used for single-field updates such as changing `status`.
   * When offline, merges `partial` into the cached task and queues an
   * `update` pending action. When online, sends the partial object to the
   * API and syncs the response back to the cache.
   *
   * @param id - The numeric identifier of the task to patch.
   * @param partial - An object containing only the fields to update.
   * @returns Observable emitting the fully updated `Task`.
   * @throws String error message via `throwError()` on HTTP failure, or
   *   `'Task not found'` when the task is absent from the offline cache.
   *
   * @example
   * ```typescript
   * this.taskService.patchTask(task.id!, { status: 'done' })
   *   .subscribe(updated => task.status = updated.status);
   * ```
   */
  patchTask(id: number, partial: Partial<Task>): Observable<Task> {
    // If offline, store locally and add to pending actions
    if (!navigator.onLine) {
      const tasks = this.localStorageService.getTasks();
      const existingTask = tasks.find(t => t.id === id);
      if (existingTask) {
        const updatedTask = { ...existingTask, ...partial };
        this.localStorageService.updateTask(updatedTask);
        this.localStorageService.addPendingAction({
          type: 'update',
          task: updatedTask
        });
        return of(updatedTask);
      }
      return throwError(() => 'Task not found');
    }

    return this.http.patch<Task>(`${this.baseUrl}/${id}`, partial).pipe(
      map(updatedTask => {
        this.localStorageService.updateTask(updatedTask);
        return updatedTask;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Deletes a task by its numeric ID.
   *
   * When offline, removes the task from localStorage and queues a `delete`
   * pending action for later sync. When online, sends the DELETE request
   * to the API and mirrors the removal in the local cache.
   *
   * @param id - The numeric identifier of the task to delete.
   * @returns Observable emitting `void` on success.
   * @throws String error message via `throwError()` on HTTP failure.
   *
   * @example
   * ```typescript
   * this.taskService.deleteTask(task.id!)
   *   .subscribe(() => this.tasks = this.tasks.filter(t => t.id !== task.id));
   * ```
   */
  deleteTask(id: number): Observable<void> {
    // If offline, remove locally and add to pending actions
    if (!navigator.onLine) {
      this.localStorageService.deleteTask(id);
      this.localStorageService.addPendingAction({
        type: 'delete',
        taskId: id
      });
      return of(void 0);
    }

    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      map(() => {
        this.localStorageService.deleteTask(id);
        return void 0;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Persists a new drag-and-drop task order by updating the `priority` field
   * on each task based on its position in `tasks`.
   *
   * Updates local storage immediately. When offline, queues a `reorder`
   * pending action for later sync. When online, updates local storage and
   * returns the reordered array (batch API update is not yet implemented).
   *
   * @param tasks - The full list of tasks in the desired display order;
   *   each task's `priority` is set to its zero-based array index.
   * @returns Observable emitting the reordered `Task[]`.
   *
   * @example
   * ```typescript
   * // Called after a CdkDragDrop event has rearranged the array
   * this.taskService.reorderTasks(this.tasks)
   *   .subscribe(ordered => this.tasks = ordered);
   * ```
   */
  reorderTasks(tasks: Task[]): Observable<Task[]> {
    // Update local storage immediately
    this.localStorageService.reorderTasks(tasks);

    // If offline, add to pending actions
    if (!navigator.onLine) {
      this.localStorageService.addPendingAction({
        type: 'reorder',
        data: { tasks }
      });
      return of(tasks);
    }

    // If online, we could implement batch update API call here
    // For now, just return the reordered tasks
    return of(tasks);
  }

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
}
