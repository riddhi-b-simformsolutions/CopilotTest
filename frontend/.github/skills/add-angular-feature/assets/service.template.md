# Service File Template

**Path:** `src/app/services/<resource-kebab>.service.ts`

Replace placeholders: `<Resource>` = PascalCase, `<resource>` = camelCase, `<resources>` = camelCase plural, `<resource-kebab>` = kebab-case.

---

## Template

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { <Resource>, <Resource>Status } from '../models/<resource-kebab>.model';
import { LocalStorageService } from './local-storage.service';

@Injectable({ providedIn: 'root' })
export class <Resource>Service {
  private readonly baseUrl = 'http://localhost:3001/<resources>';

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {}

  get<Resource>s(options?: {
    status?: <Resource>Status;
    sortByCreatedAtDesc?: boolean;
    page?: number;
    limit?: number;
  }): Observable<<Resource>[]> {
    if (!navigator.onLine) {
      let items = this.localStorageService.get<Resource>s();
      if (options?.status) {
        items = items.filter(i => i.status === options.status);
      }
      items.sort((a, b) => {
        if (a.priority !== undefined && b.priority !== undefined) {
          return a.priority - b.priority;
        }
        if (options?.sortByCreatedAtDesc) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      return of(items);
    }

    let params = new HttpParams();
    if (options?.status)              params = params.set('status', options.status);
    if (options?.sortByCreatedAtDesc) params = params.set('_sort', 'createdAt').set('_order', 'desc');
    if (options?.page)                params = params.set('_page', options.page.toString());
    if (options?.limit)               params = params.set('_limit', options.limit.toString());

    return this.http.get<<Resource>[]>(this.baseUrl, { params }).pipe(
      map(items => { this.localStorageService.set<Resource>s(items); return items; }),
      catchError(this.handleError)
    );
  }

  get<Resource>ById(id: number): Observable<<Resource>> {
    return this.http.get<<Resource>>(`${this.baseUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  create<Resource>(payload: Omit<<Resource>, 'id' | 'createdAt'>): Observable<<Resource>> {
    if (!navigator.onLine) {
      const offline: <Resource> = {
        ...payload,
        id: Date.now(),
        createdAt: new Date().toISOString()
      };
      this.localStorageService.add<Resource>(offline);
      this.localStorageService.enqueuePendingAction({ type: 'create', data: offline });
      return of(offline);
    }
    return this.http.post<<Resource>>(this.baseUrl, {
      ...payload,
      createdAt: new Date().toISOString()
    }).pipe(
      map(created => { this.localStorageService.add<Resource>(created); return created; }),
      catchError(this.handleError)
    );
  }

  update<Resource>(id: number, item: <Resource>): Observable<<Resource>> {
    if (!navigator.onLine) {
      this.localStorageService.update<Resource>(item);
      this.localStorageService.enqueuePendingAction({ type: 'update', data: item });
      return of(item);
    }
    return this.http.put<<Resource>>(`${this.baseUrl}/${id}`, item).pipe(
      map(updated => { this.localStorageService.update<Resource>(updated); return updated; }),
      catchError(this.handleError)
    );
  }

  patch<Resource>(id: number, partial: Partial<<Resource>>): Observable<<Resource>> {
    return this.http.patch<<Resource>>(`${this.baseUrl}/${id}`, partial).pipe(
      catchError(this.handleError)
    );
  }

  delete<Resource>(id: number): Observable<void> {
    if (!navigator.onLine) {
      this.localStorageService.delete<Resource>(id);
      this.localStorageService.enqueuePendingAction({ type: 'delete', itemId: id });
      return of(undefined);
    }
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      map(() => { this.localStorageService.delete<Resource>(id); }),
      catchError(this.handleError)
    );
  }

  // ─── Optional: only include if drag-and-drop reordering is required ─────────
  reorder<Resource>s(items: <Resource>[]): Observable<any> {
    const reordered = items.map((item, index) => ({ ...item, priority: index }));
    if (!navigator.onLine) {
      this.localStorageService.set<Resource>s(reordered);
      this.localStorageService.enqueuePendingAction({ type: 'reorder', items: reordered });
      return of(reordered);
    }
    const updates = reordered.map(item =>
      this.http.patch(`${this.baseUrl}/${item.id}`, { priority: item.priority })
    );
    // import { forkJoin } from 'rxjs' at the top, then:
    // return forkJoin(updates).pipe(catchError(this.handleError));
    return of(reordered); // replace this line with the forkJoin call above
  }
  // ─────────────────────────────────────────────────────────────────────────────

  private handleError(error: HttpErrorResponse): Observable<never> {
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
```

---

## Concrete Example — `Project`

```typescript
// src/app/services/project.service.ts

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly baseUrl = 'http://localhost:3001/projects';
  // ... same shape, all <Resource> replaced with Project / project / projects
}
```

---

## Notes

- `handleError` is **identical** to the one in `TaskService` — do not modify its logic.
- `baseUrl` is the only place the API path is declared — never hardcode `http://localhost:3001/...` in components.
- Remove `reorder<Resource>s()` if drag-and-drop is not required.
- If `reorder<Resource>s()` is included, remember to `import { forkJoin } from 'rxjs'` and replace the placeholder `return of(reordered)` with `return forkJoin(updates).pipe(catchError(this.handleError))`.
- Extend `LocalStorageService` with `get<Resource>s()`, `set<Resource>s()`, `add<Resource>()`, `update<Resource>()`, `delete<Resource>()` before this service compiles — see [../references/offline-support.md](../references/offline-support.md).
