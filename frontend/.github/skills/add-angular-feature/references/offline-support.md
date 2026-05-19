# Offline Support Reference

Documents the online/offline branching pattern used in `TaskService`. Apply identically to any new resource service.

---

## How It Works

1. `navigator.onLine` is checked at the start of each write — and in `getTasks` — to decide which path to take.
2. **Online path**: standard `HttpClient` call → on success, refresh local cache via `LocalStorageService`.
3. **Offline path**: read from / write to `LocalStorageService`, and enqueue a pending action.
4. On reconnect, `OfflineService` drains the pending-actions queue by replaying each action against the live API.

---

## Service Constructor

```typescript
constructor(
  private http: HttpClient,
  private localStorageService: LocalStorageService
) {}
```

> `OfflineService` is **not** injected into the service — only the container injects it (for UI status).

---

## Read Operation (online/offline branch)

```typescript
get<Resource>s(options?: { ... }): Observable<<Resource>[]> {
  if (!navigator.onLine) {
    let items = this.localStorageService.get<Resource>s();
    if (options?.status) {
      items = items.filter(i => i.status === options.status);
    }
    return of(items);
  }

  // Online: fetch from API, then refresh cache
  let params = new HttpParams();
  // ... set params ...
  return this.http.get<<Resource>[]>(this.baseUrl, { params }).pipe(
    map(items => {
      this.localStorageService.set<Resource>s(items);
      return items;
    }),
    catchError(this.handleError)
  );
}
```

---

## Write Operation — Create (offline branch)

```typescript
create<Resource>(payload: Omit<<Resource>, 'id' | 'createdAt'>): Observable<<Resource>> {
  if (!navigator.onLine) {
    const offline: <Resource> = {
      ...payload,
      id: Date.now(), // temporary — overwritten after sync
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
    map(created => {
      this.localStorageService.add<Resource>(created);
      return created;
    }),
    catchError(this.handleError)
  );
}
```

---

## Write Operation — Update (offline branch)

```typescript
update<Resource>(id: number, item: <Resource>): Observable<<Resource>> {
  if (!navigator.onLine) {
    this.localStorageService.update<Resource>(item);
    this.localStorageService.enqueuePendingAction({ type: 'update', data: item });
    return of(item);
  }

  return this.http.put<<Resource>>(`${this.baseUrl}/${id}`, item).pipe(
    map(updated => {
      this.localStorageService.update<Resource>(updated);
      return updated;
    }),
    catchError(this.handleError)
  );
}
```

---

## Write Operation — Delete (offline branch)

```typescript
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
```

---

## Pending Action Shape

```typescript
interface PendingAction {
  type: 'create' | 'update' | 'delete' | 'reorder';
  data?: any;      // full item for create / update
  itemId?: number; // item id for delete
  items?: any[];   // ordered array for reorder
}
```

Enqueue with: `this.localStorageService.enqueuePendingAction(action)`

---

## LocalStorageService — Methods to Add

For each new resource, add the following methods to `src/app/services/local-storage.service.ts` following the same pattern as the existing task methods:

| Method | Behaviour |
|--------|-----------|
| `get<Resource>s(): <Resource>[]` | Parse + return cached JSON array (or `[]` if empty) |
| `set<Resource>s(items: <Resource>[]): void` | JSON-stringify and store entire array |
| `add<Resource>(item: <Resource>): void` | Append item to cached array |
| `update<Resource>(item: <Resource>): void` | Replace by `id` in cached array |
| `delete<Resource>(id: number): void` | Remove by `id` from cached array |
| `enqueuePendingAction(action)` | Already exists — no change needed |

> Use a unique `localStorage` key per resource, e.g. `'<resources>'`. Do NOT reuse `'tasks'`.

---

## Container: Sync Status UI

Inject `OfflineService` in the container component and subscribe to `syncStatus$`:

```typescript
import { Subscription } from 'rxjs';
import { SyncStatus } from '../../../../models/task.model'; // shared interface
import { OfflineService } from '../../../../services/offline.service';

private syncSubscription?: Subscription;

ngOnInit(): void {
  this.load<Resource>s();
  this.syncSubscription = this.offlineService.syncStatus$.subscribe(status => {
    this.syncStatus = status;
    if (!status.isOnline) {
      this.successMessage = 'Working offline. Changes will sync when connection is restored.';
    } else if (status.pendingSyncCount > 0) {
      this.successMessage = `Syncing ${status.pendingSyncCount} pending changes...`;
    }
  });
}

ngOnDestroy(): void {
  this.syncSubscription?.unsubscribe();
}
```

`SyncStatus` interface is defined in `src/app/models/task.model.ts` — import from there; do not redefine it.
