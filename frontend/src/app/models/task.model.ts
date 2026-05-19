export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id?: number;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string; // ISO string
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
  priority?: number; // For drag-and-drop ordering
}

// For offline sync status
export interface SyncStatus {
  isOnline: boolean;
  pendingSyncCount: number;
  lastSyncTime: string | null;
}
