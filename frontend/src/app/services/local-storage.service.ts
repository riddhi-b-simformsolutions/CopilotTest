import { Injectable } from '@angular/core';
import { Task } from '../models/task.model';

export interface PendingAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'reorder';
  task?: Task;
  taskId?: number;
  data?: any;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private readonly TASKS_KEY = 'tasks';
  private readonly PENDING_ACTIONS_KEY = 'pending_actions';
  private readonly LAST_SYNC_KEY = 'last_sync';

  // Task operations
  getTasks(): Task[] {
    const tasksJson = localStorage.getItem(this.TASKS_KEY);
    return tasksJson ? JSON.parse(tasksJson) : [];
  }

  saveTasks(tasks: Task[]): void {
    localStorage.setItem(this.TASKS_KEY, JSON.stringify(tasks));
  }

  addTask(task: Task): void {
    const tasks = this.getTasks();
    // Assign priority based on current tasks count
    task.priority = task.priority || tasks.length;
    tasks.push(task);
    this.saveTasks(tasks);
  }

  updateTask(updatedTask: Task): void {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === updatedTask.id);
    if (index !== -1) {
      tasks[index] = { ...updatedTask };
      this.saveTasks(tasks);
    }
  }

  deleteTask(taskId: number): void {
    const tasks = this.getTasks();
    const filteredTasks = tasks.filter(t => t.id !== taskId);
    this.saveTasks(filteredTasks);
  }

  // Reorder tasks
  reorderTasks(reorderedTasks: Task[]): void {
    // Update priorities based on new order
    const tasksWithPriority = reorderedTasks.map((task, index) => ({
      ...task,
      priority: index
    }));
    this.saveTasks(tasksWithPriority);
  }

  // Pending actions for offline sync
  addPendingAction(action: Omit<PendingAction, 'id' | 'timestamp'>): void {
    const actions = this.getPendingActions();
    const newAction: PendingAction = {
      ...action,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    actions.push(newAction);
    localStorage.setItem(this.PENDING_ACTIONS_KEY, JSON.stringify(actions));
  }

  getPendingActions(): PendingAction[] {
    const actionsJson = localStorage.getItem(this.PENDING_ACTIONS_KEY);
    return actionsJson ? JSON.parse(actionsJson) : [];
  }

  removePendingAction(actionId: string): void {
    const actions = this.getPendingActions();
    const filteredActions = actions.filter(a => a.id !== actionId);
    localStorage.setItem(this.PENDING_ACTIONS_KEY, JSON.stringify(filteredActions));
  }

  clearPendingActions(): void {
    localStorage.removeItem(this.PENDING_ACTIONS_KEY);
  }

  // Sync status
  getLastSyncTime(): string | null {
    return localStorage.getItem(this.LAST_SYNC_KEY);
  }

  setLastSyncTime(time: string): void {
    localStorage.setItem(this.LAST_SYNC_KEY, time);
  }

  // Clear all data
  clearAll(): void {
    localStorage.removeItem(this.TASKS_KEY);
    localStorage.removeItem(this.PENDING_ACTIONS_KEY);
    localStorage.removeItem(this.LAST_SYNC_KEY);
  }
}
