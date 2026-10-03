import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface PromptDialogData {
  title: string;
  message?: string;
  label: string;
  type?: 'text' | 'number' | 'textarea';
  value?: string | number | null;
  required?: boolean;
  min?: number;
  hint?: string;
  confirmText?: string;
  danger?: boolean;
}

/** Single-field input dialog (rejection reason, resolution notes, mileage...). Closes with the value or null. */
@Component({
  selector: 'app-prompt-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      @if (data.message) { <p class="msg">{{ data.message }}</p> }
      <mat-form-field appearance="outline" class="field">
        <mat-label>{{ data.label }}</mat-label>
        @if (data.type === 'textarea') {
          <textarea matInput [formControl]="control" rows="4" cdkFocusInitial></textarea>
        } @else {
          <input matInput [type]="data.type || 'text'" [formControl]="control" [min]="data.min ?? null" cdkFocusInitial
                 (keyup.enter)="submit()">
        }
        @if (data.hint) { <mat-hint>{{ data.hint }}</mat-hint> }
        @if (control.hasError('required')) { <mat-error>{{ data.label }} is required</mat-error> }
        @if (control.hasError('min')) { <mat-error>Must be at least {{ data.min }}</mat-error> }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancel</button>
      <button mat-flat-button [color]="data.danger ? 'warn' : 'primary'" (click)="submit()" [disabled]="control.invalid">
        {{ data.confirmText || 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .msg { margin: 0 0 1rem; color: var(--fo-muted); line-height: 1.5; }
    .field { width: 100%; min-width: 320px; }
  `]
})
export class PromptDialogComponent {
  readonly data = inject<PromptDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<PromptDialogComponent>);

  readonly control = new FormControl<string | number | null>(this.data.value ?? null, [
    ...(this.data.required ? [Validators.required] : []),
    ...(this.data.min !== undefined ? [Validators.min(this.data.min)] : [])
  ]);

  submit(): void {
    if (this.control.valid) {
      this.ref.close(this.control.value);
    }
  }
}
