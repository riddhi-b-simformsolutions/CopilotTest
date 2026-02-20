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

  getTaskById(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.baseUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

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

  // New method for drag-and-drop reordering
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
