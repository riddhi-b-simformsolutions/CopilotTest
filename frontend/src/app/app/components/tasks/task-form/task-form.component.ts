import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Task, TaskStatus } from '../../../../models/task.model';
import { TaskService } from '../../../../services/task.service';

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.css']
})
export class TaskFormComponent implements OnChanges {
  @Input() task: Task | null = null; // null = create mode
  @Output() submitted = new EventEmitter<Task>();
  @Output() cancelled = new EventEmitter<void>();

  form: FormGroup;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  hasAttemptedSubmit = false;

  statuses: TaskStatus[] = ['todo', 'in-progress', 'done'];

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      status: ['todo', Validators.required]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task']) {
      this.errorMessage = '';
      this.successMessage = '';
      this.hasAttemptedSubmit = false;
      
      if (this.task) {
        this.form.patchValue({
          title: this.task.title,
          description: this.task.description,
          status: this.task.status
        });
      } else {
        this.form.reset({ status: 'todo' });
      }
    }
  }

  get isEditMode(): boolean {
    return !!this.task?.id;
  }

  onSubmit(): void {
    this.hasAttemptedSubmit = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please fix the validation errors before submitting.';
      return;
    }

    this.isSaving = true;

    const { title, description, status } = this.form.value;

    if (this.isEditMode && this.task && this.task.id != null) {
      const updated: Task = {
        ...this.task,
        title,
        description,
        status
      };

      this.taskService.updateTask(this.task.id, updated).subscribe({
        next: (result) => {
          this.isSaving = false;
          this.successMessage = 'Task updated successfully!';
          setTimeout(() => this.submitted.emit(result), 500); // Small delay to show success
        },
        error: (err: string) => {
          this.isSaving = false;
          this.errorMessage = this.getErrorMessage(err, 'update');
          console.error('Error updating task:', err);
        }
      });
    } else {
      this.taskService.createTask({ title, description, status }).subscribe({
        next: (created) => {
          this.isSaving = false;
          this.successMessage = 'Task created successfully!';
          this.form.reset({ status: 'todo' });
          this.hasAttemptedSubmit = false;
          setTimeout(() => this.submitted.emit(created), 500); // Small delay to show success
        },
        error: (err: string) => {
          this.isSaving = false;
          this.errorMessage = this.getErrorMessage(err, 'create');
          console.error('Error creating task:', err);
        }
      });
    }
  }

  onCancel(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.hasAttemptedSubmit = false;
    this.cancelled.emit();
  }

  private getErrorMessage(err: string, operation: 'create' | 'update'): string {
    if (err.includes('Cannot connect to server')) {
      return `Unable to ${operation} task. Please check your connection and ensure the server is running.`;
    }
    return `Failed to ${operation} task: ${err}`;
  }

  // Helper method to check if field has error and should show it
  shouldShowFieldError(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.touched || this.hasAttemptedSubmit));
  }
}
