import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NotifyService } from '../../core/services/notify.service';
import { PASSWORD_HINT, PASSWORD_PATTERN } from '../drivers/driver.models';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { newPassword, confirmPassword } = group.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword ? { mismatch: true } : null;
}

/** Self-service password change, opened from the user menu in the shell. */
@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Change password</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="grid" (ngSubmit)="save()">
        <mat-form-field appearance="outline">
          <mat-label>Current password</mat-label>
          <input matInput type="password" formControlName="currentPassword" autocomplete="current-password" cdkFocusInitial>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>New password</mat-label>
          <input matInput type="password" formControlName="newPassword" autocomplete="new-password">
          <mat-hint>{{ hint }}</mat-hint>
          <mat-error>{{ hint }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Confirm new password</mat-label>
          <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password">
          @if (form.hasError('mismatch')) { <mat-hint class="err">Passwords do not match</mat-hint> }
        </mat-form-field>
        <button type="submit" hidden></button>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving()">
        {{ saving() ? 'Saving…' : 'Change password' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.grid { display: flex; flex-direction: column; min-width: 340px; padding-top: 0.5rem; } .err { color: #dc2626; }`]
})
export class ChangePasswordDialogComponent {
  private readonly http = inject(HttpClient);
  private readonly ref = inject(MatDialogRef<ChangePasswordDialogComponent>);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  readonly hint = PASSWORD_HINT;
  readonly saving = signal(false);
  readonly form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatch });

  save(): void {
    if (this.form.invalid) return;
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.saving.set(true);
    this.http.put('/api/v1/auth/change-password', { currentPassword, newPassword }).subscribe({
      next: () => {
        this.notify.success('Password changed');
        this.ref.close(true);
      },
      error: () => this.saving.set(false)
    });
  }
}
