import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Task, TaskStatus, SyncStatus } from '../../../../models/task.model';
import { TaskService } from '../../../../services/task.service';
import { OfflineService } from '../../../../services/offline.service';

@Component({
  selector: 'app-task-manager',
  templateUrl: './task-manager.component.html',
  styleUrls: ['./task-manager.component.css']
})
export class TaskManagerComponent implements OnInit, OnDestroy {
  tasks: Task[] = [];
  isLoading = false;
  isInitialLoad = true;
  errorMessage = '';
  successMessage = '';
  showCreateForm = false;
  editingTask: Task | null = null;
  filterStatus: TaskStatus | 'all' = 'all';
  
  // Track individual operation states
  isCreating = false;
  isEditing = false;

  // Offline/sync status
  syncStatus: SyncStatus = {
    isOnline: true,
    pendingSyncCount: 0,
    lastSyncTime: null
  };

  private syncSubscription?: Subscription;

  constructor(
    private taskService: TaskService,
    private offlineService: OfflineService
  ) {}

  ngOnInit(): void {
    this.loadTasks();
    this.setupSyncStatusMonitoring();
  }

  ngOnDestroy(): void {
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
  }

  private setupSyncStatusMonitoring(): void {
    this.syncSubscription = this.offlineService.syncStatus$.subscribe(status => {
      this.syncStatus = status;
      
      // Update messages based on sync status
      if (!status.isOnline) {
        this.successMessage = 'Working offline. Changes will be synced when connection is restored.';
      } else if (status.pendingSyncCount > 0) {
        this.successMessage = `Syncing ${status.pendingSyncCount} pending changes...`;
      }
    });
  }

  loadTasks(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.taskService
      .getTasks({
        status: this.filterStatus === 'all' ? undefined : this.filterStatus,
        sortByCreatedAtDesc: true
      })
      .subscribe({
        next: (tasks) => {
          this.tasks = tasks;
          this.isLoading = false;
          this.isInitialLoad = false;
          
          // Show success message for filter changes (not initial load)
          if (!this.isInitialLoad && this.filterStatus !== 'all') {
            this.successMessage = `Found ${tasks.length} tasks with status: ${this.getFilterDisplayText()}`;
            this.clearSuccessMessage();
          }
        },
        error: (err: string) => {
          this.errorMessage = this.getErrorMessage(err);
          this.isLoading = false;
          this.isInitialLoad = false;
          console.error('Failed to load tasks:', err);
        }
      });
  }

  onCreateClicked(): void {
    this.showCreateForm = true;
    this.editingTask = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onTaskCreated(task: Task): void {
    this.showCreateForm = false;
    this.tasks = [task, ...this.tasks]; // prepend
    this.successMessage = `Task "${task.title}" created successfully!`;
    this.clearSuccessMessage();
  }

  onTaskCreateCancelled(): void {
    this.showCreateForm = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onEditTask(task: Task): void {
    this.editingTask = { ...task };
    this.showCreateForm = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onTaskUpdated(updated: Task): void {
    this.editingTask = null;
    this.tasks = this.tasks.map(t => (t.id === updated.id ? updated : t));
    this.successMessage = `Task "${updated.title}" updated successfully!`;
    this.clearSuccessMessage();
  }

  onTaskEditCancelled(): void {
    this.editingTask = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onDeleteTask(id: number): void {
    const deletedTask = this.tasks.find(t => t.id === id);
    this.tasks = this.tasks.filter(t => t.id !== id);
    
    if (deletedTask) {
      this.successMessage = `Task "${deletedTask.title}" deleted successfully!`;
      this.clearSuccessMessage();
    }
  }

  onStatusChanged(updated: Task): void {
    this.tasks = this.tasks.map(t => (t.id === updated.id ? updated : t));
    this.successMessage = `Task status updated to "${updated.status}"`;
    this.clearSuccessMessage();
  }

  onFilterChange(status: TaskStatus | 'all'): void {
    this.filterStatus = status;
    this.loadTasks();
  }

  onTaskReordered(reorderedTasks: Task[]): void {
    this.tasks = reorderedTasks;
    
    // Save the new order
    this.taskService.reorderTasks(reorderedTasks).subscribe({
      next: () => {
        this.successMessage = 'Tasks reordered successfully!';
        this.clearSuccessMessage();
      },
      error: (err: string) => {
        this.errorMessage = `Failed to save new order: ${err}`;
        console.error('Failed to reorder tasks:', err);
      }
    });
  }

  // Force sync method for manual sync button
  async onForceSync(): Promise<void> {
    try {
      this.successMessage = 'Syncing...';
      await this.offlineService.forcSync();
      this.loadTasks(); // Reload tasks after sync
      this.successMessage = 'Sync completed successfully!';
      this.clearSuccessMessage();
    } catch (error) {
      this.errorMessage = 'Sync failed. Please check your connection.';
      console.error('Sync failed:', error);
    }
  }

  // Utility methods for better error handling and messaging
  private getErrorMessage(err: string): string {
    if (err.includes('Cannot connect to server')) {
      return 'Unable to connect to the task server. Please ensure the Mock API is running on http://localhost:3001';
    }
    return `Error loading tasks: ${err}`;
  }

  private getFilterDisplayText(): string {
    switch (this.filterStatus) {
      case 'todo':
        return 'Todo';
      case 'in-progress':
        return 'In Progress';
      case 'done':
        return 'Done';
      default:
        return 'All';
    }
  }

  private clearSuccessMessage(): void {
    setTimeout(() => {
      this.successMessage = '';
    }, 3000); // Clear after 3 seconds
  }

  private clearErrorMessage(): void {
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000); // Clear after 5 seconds
  }
}
