# Architecture Patterns Reference

Concrete rules derived from the existing `Task` feature. Apply these exactly when scaffolding any new resource.

---

## Container Component Rules

File: `<resource-kebab>-manager.component.ts`

**What belongs here:**
- Data fetching (`load<Resource>s()` called on `ngOnInit`)
- All state arrays and flags (see **State Flags** table below)
- Form visibility toggles: `showCreateForm`, `editing<Resource>`
- Filter state: `filterStatus: <Resource>Status | 'all'`
- Sync status: `syncStatus: SyncStatus` from `OfflineService`
- Event handler methods (`on*`) that receive emissions from child components
- Subscription lifecycle — subscribe in `ngOnInit`, unsubscribe in `ngOnDestroy`

**What does NOT belong here:**
- `HttpClient` calls — always go through the service
- Form validation logic
- `confirm()` delete dialogs
- Optimistic UI updates or rollback

---

## Form Component Rules

File: `<resource-kebab>-form.component.ts`

- Owns the `FormGroup` instance — created in constructor via `FormBuilder`
- Reads `@Input()` entity to determine create vs. edit mode — `null` = create
- Emits `submitted` (carrying the saved/created entity) and `cancelled`
- Calls service directly for create/update operations
- Never calls `HttpClient` — always the service
- Flags: `isSaving`, `errorMessage`, `hasAttemptedSubmit`

---

## List Component Rules

File: `<resource-kebab>-list.component.ts`

- Stateless regarding data — receives array via `@Input()`
- Owns operation-tracking sets: `deletingIds`, `updatingStatusIds`
- Calls service only for delete and status-patch operations
- Emits results back up via `@Output()` events
- Applies optimistic UI for status changes with rollback on error

---

## State Flags

| Flag | Type | Where | Purpose |
|------|------|-------|---------|
| `isLoading` | `boolean` | Container | Active during full list-load operations |
| `isInitialLoad` | `boolean` | Container | True until first successful load |
| `errorMessage` | `string` | Container & Form | Shown in red banner / inline form error |
| `successMessage` | `string` | Container | Auto-cleared positive feedback |
| `showCreateForm` | `boolean` | Container | Toggles create form visibility |
| `editing<Resource>` | `<Resource> \| null` | Container | Non-null = edit form is open |
| `isSaving` | `boolean` | Form | Disables submit button during API call |
| `hasAttemptedSubmit` | `boolean` | Form | Shows validation errors only after first submit attempt |
| `deletingIds` | `Set<number>` | List | Disables delete button per row during deletion |
| `updatingStatusIds` | `Set<number>` | List | Disables status select per row during patch |

---

## Reactive Form Shape

```typescript
this.form = this.fb.group({
  title:       ['', [Validators.required, Validators.minLength(3)]],
  description: [''],
  status:      ['todo', Validators.required]
});
```

Rules:
- Use `formControlName` in templates — **never** `[(ngModel)]` on reactive form inputs.
- `ngOnChanges` must reset or patch when the `@Input()` entity changes.
- Form reset default: `{ status: 'todo' }`, all other fields empty.
- Mark all as touched on invalid submit attempt: `this.form.markAllAsTouched()`.

---

## Event Emitter Naming Convention

| Output | Type | Source | Container handler |
|--------|------|--------|-------------------|
| `edit` | `EventEmitter<T>` | List | Sets `editing<Resource>` |
| `delete` | `EventEmitter<number>` | List | Splices item from `<resources>[]` |
| `statusChange` | `EventEmitter<T>` | List | Replaces item in `<resources>[]` |
| `reorder` | `EventEmitter<T[]>` | List | Replaces `<resources>[]` |
| `submitted` | `EventEmitter<T>` | Form | Prepends (create) or replaces (edit) in `<resources>[]` |
| `cancelled` | `EventEmitter<void>` | Form | Clears `showCreateForm` / `editing<Resource>` |

---

## Status Display Pattern

Always define a `getStatusDisplayText()` helper in the List component:

```typescript
getStatusDisplayText(status: <Resource>Status): string {
  switch (status) {
    case 'todo':        return 'Todo';
    case 'in-progress': return 'In Progress';
    case 'done':        return 'Done';
    default:            return status;
  }
}
```

Apply CSS classes matching status values (`todo`, `in-progress`, `done`) — the global
`styles.css` already defines colour rules for these class names.

---

## Optional: Drag-and-Drop Reordering

Only include if explicitly requested by the user.

`DragDropModule` from `@angular/cdk/drag-drop` is already imported in `app.module.ts`.

**List component additions:**

```typescript
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

onDrop(event: CdkDragDrop<T[]>): void {
  moveItemInArray(this.<resources>, event.previousIndex, event.currentIndex);
  this.reorder.emit([...this.<resources>]);
}
```

**Container:** call `<Resource>Service.reorder<Resource>s(items)` on the `reorder` event.

**Service:** `reorder<Resource>s(items)` — PATCH each item with `{ priority: index }`.

---

## Import Path Convention

Components inside `src/app/app/components/<resource-kebab>/` use these relative paths:

| Target | Relative path from the component folder |
|--------|-----------------------------------------|
| Model  | `../../../../models/<resource-kebab>.model` |
| Service | `../../../../services/<resource-kebab>.service` |
| OfflineService | `../../../../services/offline.service` |
| LocalStorageService | `../../../../services/local-storage.service` |
