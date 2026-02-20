import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Task, TaskStatus } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly baseUrl = 'http://localhost:3001/tasks';

  constructor(private http: HttpClient) {}

  getTasks(options?: {
    status?: TaskStatus;
    sortByCreatedAtDesc?: boolean;
    page?: number;
    limit?: number;
  }): Observable<Task[]> {
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
      createdAt: new Date().toISOString()
    };

    return this.http.post<Task>(this.baseUrl, body).pipe(
      catchError(this.handleError)
    );
  }

  updateTask(id: number, task: Task): Observable<Task> {
    return this.http.put<Task>(`${this.baseUrl}/${id}`, task).pipe(
      catchError(this.handleError)
    );
  }

  patchTask(id: number, partial: Partial<Task>): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/${id}`, partial).pipe(
      catchError(this.handleError)
    );
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
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
