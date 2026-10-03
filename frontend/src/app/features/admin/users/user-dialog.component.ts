import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ROLE_LABELS } from '../../../core/layout/shell/shell.component';
import { PASSWORD_HINT, PASSWORD_PATTERN } from '../../drivers/driver.models';
import { AdminUser, ROLES } from './user.models';

export interface UserDialogData {
  user?: AdminUser;
  self?: boolean;
}

/** Create or edit a user. Closes with the saved user, or undefined when cancelled. */
@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ editing ? 'Edit ' + data.user!.username : 'New user' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="grid" (ngSubmit)="save()">
        @if (!editing) {
          <mat-form-field appearance="outline">
            <mat-label>Username</mat-label>
            <input matInput formControlName="username" maxlength="50" autocomplete="off">
            <mat-error>3–50 letters, digits, dots or underscores</mat-error>
          </mat-form-field>
        }
        <mat-form-field appearance="outline">
          <mat-label>Full name</mat-label>
          <input matInput formControlName="fullName" maxlength="100">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email">
          <mat-error>Enter a valid email</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Role</mat-label>
          <mat-select formControlName="role">
            @for (r of roles; track r) { <mat-option [value]="r">{{ roleLabels[r] }}</mat-option> }
          </mat-select>
          @if (roleLocked) { <mat-hint>{{ data.self ? 'You cannot change your own role' : 'Has a driver profile' }}</mat-hint> }
        </mat-form-field>
        @if (!editing) {
          <mat-form-field appearance="outline">
            <mat-label>Initial password</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="new-password">
            <mat-hint>{{ passwordHint }}</mat-hint>
            <mat-error>{{ passwordHint }}</mat-error>
          </mat-form-field>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving()">
        {{ saving() ? 'Saving…' : (editing ? 'Save' : 'Create user') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.grid { display: flex; flex-direction: column; min-width: 360px; padding-top: 0.5rem; } .grid mat-form-field { width: 100%; }`]
})
export class UserDialogComponent {
  readonly data = inject<UserDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<UserDialogComponent>);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  readonly editing = !!this.data.user;
  readonly roleLocked = !!this.data.self || !!this.data.user?.hasDriverProfile;
  readonly roles = ROLES;
  readonly roleLabels = ROLE_LABELS;
  readonly passwordHint = PASSWORD_HINT;
  readonly saving = signal(false);

  readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[a-zA-Z0-9_.]+$/)]],
    fullName: [this.data.user?.fullName ?? '', [Validators.required, Validators.maxLength(100)]],
    email: [this.data.user?.email ?? '', [Validators.required, Validators.email]],
    role: [this.data.user?.role ?? 'FLEET_MANAGER', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)]]
  });

  constructor() {
    if (this.editing) {
      this.form.controls.username.disable();
      this.form.controls.password.disable();
      if (this.roleLocked) this.form.controls.role.disable();
    }
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const request$ = this.editing
      ? this.http.put<AdminUser>(`/api/v1/admin/users/${this.data.user!.id}`, {
          fullName: v.fullName?.trim(),
          email: v.email?.trim(),
          ...(this.roleLocked ? {} : { role: v.role })
        })
      : this.http.post<AdminUser>('/api/v1/admin/users', {
          username: v.username?.trim(),
          fullName: v.fullName?.trim(),
          email: v.email?.trim(),
          role: v.role,
          password: v.password
        });
    request$.subscribe({
      next: user => this.ref.close(user),
      error: () => this.saving.set(false)
    });
  }
}
