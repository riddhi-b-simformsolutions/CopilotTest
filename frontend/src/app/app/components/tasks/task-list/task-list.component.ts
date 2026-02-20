import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Task, TaskStatus } from '../../../../models/task.model';
import { TaskService } from '../../../../services/task.service';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent {
  @Input() tasks: Task[] = [];
  @Output() edit = new EventEmitter<Task>();
  @Output() delete = new EventEmitter<number>();
  @Output() statusChange = new EventEmitter<Task>();
  @Output() reorder = new EventEmitter<Task[]>();

  deletingIds = new Set<number>();
  updatingStatusIds = new Set<number>();

  constructor(private taskService: TaskService) {}

  getStatusDisplayText(status: TaskStatus): string {
    switch (status) {
      case 'todo':
        return 'Todo';
      case 'in-progress':
        return 'In Progress';
      case 'done':
        return 'Done';
      default:
        return status;
    }
  }

  onEdit(task: Task): void {
    this.edit.emit(task);
  }

  onDelete(task: Task): void {
    if (!task.id) return;
    
    const confirmed = confirm(`Are you sure you want to delete "${task.title}"?`);
    if (!confirmed) return;

    this.deletingIds.add(task.id);
    this.taskService.deleteTask(task.id).subscribe({
      next: () => {
        this.deletingIds.delete(task.id!);
        this.delete.emit(task.id!);
      },
      error: (errorMessage: string) => {
        this.deletingIds.delete(task.id!);
        alert(`Failed to delete task: ${errorMessage}`);
      }
    });
  }

  changeStatus(task: Task, status: TaskStatus): void {
    if (!task.id || task.status === status) return;

    // Store original status for rollback
    const originalStatus = task.status;
    
    // Optimistic UI update
    task.status = status;
    this.updatingStatusIds.add(task.id);
    
    this.taskService.patchTask(task.id, { status }).subscribe({
      next: (updated) => {
        this.updatingStatusIds.delete(task.id!);
        // Emit the updated task from server
        this.statusChange.emit(updated);
        
        // Show success feedback
        this.showStatusChangeSuccess(task.title, status);
      },
      error: (errorMessage: string) => {
        this.updatingStatusIds.delete(task.id!);
        
        // Rollback optimistic update
        task.status = originalStatus;
        
        // Show error feedback
        this.showStatusChangeError(task.title, errorMessage);
      }
    });
  }

  private showStatusChangeSuccess(taskTitle: string, newStatus: TaskStatus): void {
    const statusText = this.getStatusDisplayText(newStatus);
    console.log(`✅ Task "${taskTitle}" status changed to ${statusText}`);
    // You could also show a toast notification here
  }

  private showStatusChangeError(taskTitle: string, errorMessage: string): void {
    console.error(`❌ Failed to update status for "${taskTitle}": ${errorMessage}`);
    alert(`Failed to update status for "${taskTitle}". Please try again.`);
  }

  isDeleting(task: Task): boolean {
    return task.id !== undefined && this.deletingIds.has(task.id);
  }

  isUpdatingStatus(task: Task): boolean {
    return task.id !== undefined && this.updatingStatusIds.has(task.id);
  }

  // Drag and drop functionality
  onDrop(event: CdkDragDrop<Task[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      // Create a copy of tasks array
      const reorderedTasks = [...this.tasks];
      
      // Move the item in the array
      moveItemInArray(reorderedTasks, event.previousIndex, event.currentIndex);
      
      // Update the local tasks array immediately for UI responsiveness
      this.tasks = reorderedTasks;
      
      // Emit the reordered tasks to parent component
      this.reorder.emit(reorderedTasks);
    }
  }
}
