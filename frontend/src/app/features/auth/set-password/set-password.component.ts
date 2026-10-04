import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { switchMap } from 'rxjs';
import { AuthStore } from '../../../core/stores/auth.store';
import { AuthService } from '../../../core/services/auth.service';
import { NotifyService } from '../../../core/services/notify.service';
import { PASSWORD_HINT, PASSWORD_PATTERN } from '../../drivers/driver.models';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { newPassword, confirmPassword } = group.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword ? { mismatch: true } : null;
}

/**
 * Shown after signing in with an administrator-issued temporary password. The user can't use the
 * app until they choose their own password (the API enforces this too).
 */
@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule],
  template: `
    <div class="page">
      <div class="center">
        <div class="logo">
          <span class="logo-mark"><mat-icon>local_shipping</mat-icon></span>
          <span class="logo-text">FleetOps</span>
        </div>
        <div class="card">
          <h2>Set your new password</h2>
          <p class="hint">
            Welcome{{ name ? ', ' + name : '' }}. You signed in with a temporary password -
            choose your own to continue.
          </p>
          <form [formGroup]="form" (ngSubmit)="save()">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Temporary password</mat-label>
              <input matInput type="password" formControlName="currentPassword" autocomplete="current-password">
              <mat-hint>The one from your e-mail</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>New password</mat-label>
              <input matInput type="password" formControlName="newPassword" autocomplete="new-password">
              <mat-hint>{{ rule }}</mat-hint>
              <mat-error>{{ rule }}</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Confirm new password</mat-label>
              <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password">
              @if (form.hasError('mismatch')) { <mat-hint class="err">Passwords do not match</mat-hint> }
            </mat-form-field>
            <button mat-flat-button color="primary" type="submit" class="full submit"
                    [disabled]="form.invalid || saving()">
              @if (saving()) { <mat-spinner diameter="20"></mat-spinner> } @else { Save and continue }
            </button>
          </form>
          <button mat-button type="button" class="full signout" (click)="signOut()">Log out</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page {
      display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem 1rem;
      background:
        radial-gradient(ellipse at center, rgba(6, 12, 24, 0.55) 0%, rgba(6, 12, 24, 0.85) 75%),
        url('/assets/images/fleet-bg.jpg') center / cover no-repeat fixed;
    }
    .center { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; width: 100%; max-width: 440px; }
    .logo { display: flex; align-items: center; gap: 0.75rem; color: #fff; }
    .logo-mark {
      display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px;
      background: linear-gradient(135deg, #14b8a6, #22d3ee);
    }
    .logo-text { font-size: 1.4rem; font-weight: 700; }
    .card {
      width: 100%; padding: 2rem 1.75rem 1.25rem; border-radius: 20px; background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
    }
    h2 { margin: 0; font-size: 1.45rem; font-weight: 700; text-align: center; }
    .hint { margin: 0.4rem 0 1.5rem; color: #64748b; text-align: center; line-height: 1.5; }
    .full { width: 100%; }
    .submit { height: 48px; font-weight: 600; margin-top: 0.75rem; }
    .signout { margin-top: 0.5rem; color: #64748b; }
    .err { color: #dc2626; }
  `]
})
export class SetPasswordComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly notify = inject(NotifyService);

  readonly name = (this.authStore.user()?.fullName ?? '').split(' ')[0];
  readonly rule = PASSWORD_HINT;
  readonly saving = signal(false);
  readonly form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatch });

  save(): void {
    if (this.form.invalid) return;
    const { currentPassword, newPassword } = this.form.getRawValue();
    const username = this.authStore.user()!.username;
    this.saving.set(true);
    // Changing the password signs out other sessions, so sign straight back in with the new one
    this.http.put('/api/v1/auth/change-password', { currentPassword, newPassword }).pipe(
      switchMap(() => this.authService.login({ username, password: newPassword! }))
    ).subscribe({
      next: () => {
        this.notify.success('Password changed - welcome to FleetOps');
        this.router.navigate(['/dashboard']);
      },
      error: () => this.saving.set(false)
    });
  }

  signOut(): void {
    this.authService.logout();
  }
}
