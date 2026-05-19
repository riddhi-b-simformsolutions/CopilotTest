---
name: add-angular-feature
description: 'Scaffold a complete Angular CRUD feature for a new data resource. Use when: adding a new entity (e.g. Project, Tag, Category), creating a new CRUD page, generating model/service/container/form/list components and routing for a new resource. Follows container+presentational architecture, Reactive Forms, TaskService online/offline pattern, and project conventions from copilot-instructions.md.'
argument-hint: 'Name of the new resource in singular PascalCase (e.g. Project, Tag, Category)'
---

# Add Angular Feature

On-demand workflow for scaffolding a complete CRUD feature for a **new resource** in this Angular Task Manager project.

## When to Use

- Adding a new entity alongside tasks (e.g. Projects, Tags, Categories, Comments)
- Generating a full set of model + service + 3 components + routing + module wiring
- Ensuring the new feature is consistent with the existing `Task` architecture

**Argument (optional):** name of the new resource in singular PascalCase, e.g. `Project`.

---

## Naming Reference

| Concept | Pattern | Example |
|---------|---------|---------|
| Model type | `<Resource>Status` | `ProjectStatus` |
| Interface | `<Resource>` | `Project` |
| Service class | `<Resource>Service` | `ProjectService` |
| Container component | `<Resource>ManagerComponent` | `ProjectManagerComponent` |
| Form component | `<Resource>FormComponent` | `ProjectFormComponent` |
| List component | `<Resource>ListComponent` | `ProjectListComponent` |
| Selector (manager) | `app-<resource-kebab>-manager` | `app-project-manager` |
| Route path (plural) | `<resources>` | `projects` |
| Model file | `<resource-kebab>.model.ts` | `project.model.ts` |
| Service file | `<resource-kebab>.service.ts` | `project.service.ts` |

Throughout this procedure:
- `<Resource>` = PascalCase noun (e.g. `Project`)
- `<resource>` = camelCase noun (e.g. `project`)
- `<resources>` = camelCase plural (e.g. `projects`)
- `<resource-kebab>` = kebab-case (e.g. `project`)

---

## Procedure

Work through each phase in order. Do not skip phases — each builds on the previous.

---

### Phase 1 — Model

**Create** `src/app/models/<resource-kebab>.model.ts`

Use the template in [./assets/model.template.md](./assets/model.template.md).

- Define `<Resource>Status` as a string union (`'todo' | 'in-progress' | 'done'`).
- Define `<Resource>` interface with: `id?`, `title`, `description?`, `status`, `createdAt` (ISO string), `priority?` (for ordering).
- Export both.

---

### Phase 2 — Service

**Create** `src/app/services/<resource-kebab>.service.ts`

Use the template in [./assets/service.template.md](./assets/service.template.md).

- `baseUrl = 'http://localhost:3001/<resources>'` — the **only** place the URL appears.
- Implement: `get<Resource>s(options?)`, `get<Resource>ById(id)`, `create<Resource>(payload)`, `update<Resource>(id, item)`, `patch<Resource>(id, partial)`, `delete<Resource>(id)`.
- Add `reorder<Resource>s(items)` only if drag-and-drop is needed.
- Include the **identical** `handleError()` from `TaskService`. All methods pipe through `catchError(this.handleError)`.
- Inject `HttpClient` and `LocalStorageService`. Apply online/offline branching per [./references/offline-support.md](./references/offline-support.md).
- Extend `LocalStorageService` with `get<Resource>s()`, `set<Resource>s()`, `add<Resource>()`, `update<Resource>()`, `delete<Resource>()` before the service compiles.

---

### Phase 3 — Container Component

**Create directory** `src/app/app/components/<resource-kebab>/<resource-kebab>-manager/`

Files: `<resource-kebab>-manager.component.ts`, `.html`, `.css`

Follow **Container rules** in [./references/architecture-patterns.md](./references/architecture-patterns.md):

**TypeScript:**
- Selector: `app-<resource-kebab>-manager`
- Implements `OnInit`, `OnDestroy`
- State: `<resources>: <Resource>[] = []`, `isLoading`, `isInitialLoad`, `errorMessage`, `successMessage`, `showCreateForm`, `editing<Resource>: <Resource> | null`, `filterStatus: <Resource>Status | 'all'`
- Sync: `syncStatus: SyncStatus` — subscribe to `OfflineService.syncStatus$`
- Methods: `load<Resource>s()`, `on<Resource>Submit(item)`, `onEdit<Resource>(item)`, `onDelete<Resource>(id)`, `onStatusChange<Resource>(updated)`, `onFilter<Resource>s(status)`, `onReorder<Resource>s(items)` (if reorder)
- Unsubscribe in `ngOnDestroy`

**Template:**
- Page title: `<Resource> Manager`
- Toolbar: "Add `<Resource>`" button + status filter `<select>` (`all`, `todo`, `in-progress`, `done`)
- Error banner: `*ngIf="errorMessage"` in red
- Loading: `*ngIf="isLoading"` showing "Loading `<resources>`..."
- `<app-<resource-kebab>-form>` — shown when `showCreateForm` or `editing<Resource>`
- `<app-<resource-kebab>-list>` — always shown (handles empty state)

---

### Phase 4 — Form Component

**Create** `src/app/app/components/<resource-kebab>/<resource-kebab>-form/`

Files: `<resource-kebab>-form.component.ts`, `.html`, `.css`

Follow **Form rules** in [./references/architecture-patterns.md](./references/architecture-patterns.md):

- `@Input() <resource>: <Resource> | null = null` — null = create mode, non-null = edit mode
- `@Output() submitted = new EventEmitter<<Resource>>()`
- `@Output() cancelled = new EventEmitter<void>()`
- Reactive Form via `FormBuilder`:
  ```typescript
  title:       ['', [Validators.required, Validators.minLength(3)]],
  description: [''],
  status:      ['todo', Validators.required]
  ```
- `ngOnChanges`: patch values in edit mode, reset (`{ status: 'todo' }`) in create mode
- `get isEditMode(): boolean { return !!this.<resource>?.id; }`
- Flags: `isSaving = false`, `errorMessage = ''`, `hasAttemptedSubmit = false`
- On submit: call `<Resource>Service.create<Resource>()` or `update<Resource>()`. Emit `submitted` on success. Never call `HttpClient` directly.
- Use `formControlName` in template — **never** `[(ngModel)]` on reactive form inputs.

---

### Phase 5 — List Component

**Create** `src/app/app/components/<resource-kebab>/<resource-kebab>-list/`

Files: `<resource-kebab>-list.component.ts`, `.html`, `.css`

Follow **List rules** in [./references/architecture-patterns.md](./references/architecture-patterns.md):

- `@Input() <resources>: <Resource>[] = []`
- `@Output() edit = new EventEmitter<<Resource>>()`
- `@Output() delete = new EventEmitter<number>()`
- `@Output() statusChange = new EventEmitter<<Resource>>()`
- `@Output() reorder = new EventEmitter<<Resource>[]>()` (only if reorder enabled)
- Tracking sets: `deletingIds = new Set<number>()`, `updatingStatusIds = new Set<number>()`
- `onDelete()`: `confirm()` dialog → `<Resource>Service.delete<Resource>()` → emit `delete`
- `changeStatus()`: optimistic update → `<Resource>Service.patch<Resource>(id, { status })` → emit `statusChange`; rollback on error
- Table columns: **Title**, **Description**, **Status**, **Created At** (`| date:'medium'`), **Actions**
- Actions per row: Edit button, Delete button (disabled + "Deleting..." when `deletingIds.has(id)`), Status `<select>` (disabled when `updatingStatusIds.has(id)`)

Optional drag-drop: import `CdkDragDrop`, `moveItemInArray` from `@angular/cdk/drag-drop`. See [./references/architecture-patterns.md](./references/architecture-patterns.md#optional-drag-and-drop-reordering).

---

### Phase 6 — Routing

**Edit** `src/app/app-routing.module.ts`:

```typescript
import { <Resource>ManagerComponent } from
  './app/components/<resource-kebab>/<resource-kebab>-manager/<resource-kebab>-manager.component';

// Inside routes array — BEFORE the '**' catch-all:
{ path: '<resources>', component: <Resource>ManagerComponent },
```

---

### Phase 7 — Module

**Edit** `src/app/app.module.ts`:

```typescript
import { <Resource>ManagerComponent } from
  './app/components/<resource-kebab>/<resource-kebab>-manager/<resource-kebab>-manager.component';
import { <Resource>FormComponent } from
  './app/components/<resource-kebab>/<resource-kebab>-form/<resource-kebab>-form.component';
import { <Resource>ListComponent } from
  './app/components/<resource-kebab>/<resource-kebab>-list/<resource-kebab>-list.component';

// In declarations: [...]
<Resource>ManagerComponent,
<Resource>FormComponent,
<Resource>ListComponent,
```

`HttpClientModule`, `ReactiveFormsModule`, `DragDropModule`, and `FormsModule` are already registered — do not add them again.

---

### Phase 8 — Navigation

**Edit** `src/app/components/home/home.component.html`:

```html
<a routerLink="/<resources>">Go to <Resource> Manager</a>
```

Follow the same link pattern as any existing `routerLink` entries on the page.

---

### Phase 9 — Documentation

After scaffolding, invoke `@docs-writer` to:

1. Add **TSDoc comments** to all public methods in `<resource-kebab>.service.ts`.
2. Add a new **section in `FEATURES.md`** describing the feature (emoji heading, what it does, how to use, tech implementation).
3. Update the **`README.md` API reference table** with the new `/<resources>` endpoints.

---

## Completion Checklist

- [ ] Model exports `<Resource>Status` type and `<Resource>` interface
- [ ] `baseUrl = 'http://localhost:3001/<resources>'` — no URL hardcoded elsewhere
- [ ] All service methods pipe through `catchError(this.handleError)`
- [ ] No `HttpClient` in components — all HTTP goes through the service
- [ ] No `[(ngModel)]` on reactive form inputs — use `formControlName` only
- [ ] Form `ngOnChanges` handles both create (reset) and edit (patch) modes correctly
- [ ] Container manages `isLoading`, `errorMessage`, `successMessage`
- [ ] List uses `deletingIds` and `updatingStatusIds` to disable elements during ops
- [ ] Route added before `**` catch-all in `app-routing.module.ts`
- [ ] All 3 components declared in `app.module.ts`
- [ ] Navigation link added to home
- [ ] `LocalStorageService` extended with resource-specific CRUD methods
- [ ] `@docs-writer` invoked for TSDoc + FEATURES.md + README
