# Model File Template

**Path:** `src/app/models/<resource-kebab>.model.ts`

Replace `<Resource>` with PascalCase (e.g. `Project`) and `<resource-kebab>` with kebab-case (e.g. `project`).

---

## Template

```typescript
export type <Resource>Status = 'todo' | 'in-progress' | 'done';

export interface <Resource> {
  id?: number;
  title: string;
  description?: string;
  status: <Resource>Status;
  createdAt: string; // ISO string
  priority?: number; // For drag-and-drop ordering (optional)
}
```

---

## Concrete Example — `Project`

```typescript
// src/app/models/project.model.ts

export type ProjectStatus = 'todo' | 'in-progress' | 'done';

export interface Project {
  id?: number;
  title: string;
  description?: string;
  status: ProjectStatus;
  createdAt: string; // ISO string
  priority?: number;
}
```

---

## Notes

- `TaskStatus` / `Task` in `task.model.ts` follow this exact pattern — refer to them as the canonical example.
- If the new resource requires **additional fields** (e.g. `dueDate`, `assignee`), add them after `priority`.
- If the resource needs a **different status set** (e.g. `'open' | 'closed' | 'archived'`), update the union type accordingly — the rest of the scaffolding handles it automatically.
- Do **not** import from `task.model.ts` for entity types — each resource has its own model file.
- The `SyncStatus` interface in `task.model.ts` is shared infrastructure. Import from there when needed:
  ```typescript
  import { SyncStatus } from './task.model';
  ```
