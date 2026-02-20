import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { SyncStatus } from '../models/task.model';
import { LocalStorageService, PendingAction } from './local-storage.service';
import { TaskService } from './task.service';

@Injectable({
  providedIn: 'root'
})
export class OfflineService {
  private syncStatusSubject = new BehaviorSubject<SyncStatus>({
    isOnline: navigator.onLine,
    pendingSyncCount: 0,
    lastSyncTime: null
  });

  public syncStatus$ = this.syncStatusSubject.asObservable();
  public isOnline$ = this.getOnlineStatus();

  constructor(
    private localStorageService: LocalStorageService,
    private taskService: TaskService
  ) {
    this.initializeOfflineSupport();
  }

  private initializeOfflineSupport(): void {
    // Listen for online/offline events
    this.isOnline$.subscribe(isOnline => {
      const currentStatus = this.syncStatusSubject.value;
      this.syncStatusSubject.next({
        ...currentStatus,
        isOnline
      });

      // Auto-sync when coming back online
      if (isOnline && currentStatus.pendingSyncCount > 0) {
        this.syncPendingActions();
      }
    });

    // Initialize sync status
    this.updateSyncStatus();
  }

  private getOnlineStatus(): Observable<boolean> {
    return merge(
      of(navigator.onLine),
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).pipe(startWith(navigator.onLine));
  }

  updateSyncStatus(): void {
    const pendingActions = this.localStorageService.getPendingActions();
    const lastSyncTime = this.localStorageService.getLastSyncTime();
    const currentStatus = this.syncStatusSubject.value;

    this.syncStatusSubject.next({
      ...currentStatus,
      pendingSyncCount: pendingActions.length,
      lastSyncTime
    });
  }

  async syncPendingActions(): Promise<void> {
    const pendingActions = this.localStorageService.getPendingActions();
    
    if (pendingActions.length === 0) {
      return;
    }

    console.log(`Syncing ${pendingActions.length} pending actions...`);

    for (const action of pendingActions) {
      try {
        await this.processPendingAction(action);
        this.localStorageService.removePendingAction(action.id);
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        // Keep the action for retry later
        break;
      }
    }

    // Update sync time
    this.localStorageService.setLastSyncTime(new Date().toISOString());
    this.updateSyncStatus();
  }

  private async processPendingAction(action: PendingAction): Promise<void> {
    switch (action.type) {
      case 'create':
        if (action.task) {
          await this.taskService.createTask({
            title: action.task.title,
            description: action.task.description,
            status: action.task.status
          }).toPromise();
        }
        break;

      case 'update':
        if (action.task && action.task.id) {
          await this.taskService.updateTask(action.task.id, action.task).toPromise();
        }
        break;

      case 'delete':
        if (action.taskId) {
          await this.taskService.deleteTask(action.taskId).toPromise();
        }
        break;

      case 'reorder':
        // For reorder, we need to update all tasks with their new priorities
        if (action.data && action.data.tasks) {
          for (const task of action.data.tasks) {
            if (task.id) {
              await this.taskService.patchTask(task.id, { priority: task.priority }).toPromise();
            }
          }
        }
        break;
    }
  }

  // Method to manually trigger sync
  async forcSync(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }
    await this.syncPendingActions();
  }
}
