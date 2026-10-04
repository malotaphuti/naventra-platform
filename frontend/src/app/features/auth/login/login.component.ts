import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="login-page">
      <div class="center">
        <div class="logo">
          <span class="logo-mark"><mat-icon>local_shipping</mat-icon></span>
          <span class="logo-text">FleetOps</span>
        </div>

        <div class="login-card">
          <h2>Welcome</h2>
          <p class="hint">Log in to your FleetOps account</p>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Username</mat-label>
              <input matInput formControlName="username" placeholder="Enter username" autocomplete="username">
              <mat-icon matPrefix>person</mat-icon>
              @if (loginForm.get('username')?.hasError('required') && loginForm.get('username')?.touched) {
                <mat-error>Username is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput [type]="hidePassword() ? 'password' : 'text'"
                     formControlName="password" placeholder="Enter password" autocomplete="current-password">
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button"
                      (click)="hidePassword.set(!hidePassword())"
                      [attr.aria-label]="hidePassword() ? 'Show password' : 'Hide password'">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (loginForm.get('password')?.hasError('required') && loginForm.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>

            @if (errorMessage()) {
              <div class="error-message">{{ errorMessage() }}</div>
            }

            <button mat-flat-button color="primary" type="submit" class="full-width login-btn"
                    [disabled]="loading() || loginForm.invalid">
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Log in
              }
            </button>
          </form>
        </div>
      </div>

      <small class="copyright">© {{ year }} FleetOps · Enterprise Fleet Management</small>
    </div>
  `,
  styles: [`
    .login-page {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem 1rem 3.5rem;
      color: #fff;
      background:
        radial-gradient(ellipse at center, rgba(6, 12, 24, 0.55) 0%, rgba(6, 12, 24, 0.85) 75%),
        url('/assets/images/fleet-bg.jpg') center / cover no-repeat fixed;
    }
    .center { display: flex; flex-direction: column; align-items: center; gap: 1.75rem; width: 100%; max-width: 420px; }
    .logo { display: flex; align-items: center; gap: 0.75rem; }
    .logo-mark {
      display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px;
      background: linear-gradient(135deg, #14b8a6, #22d3ee);
      box-shadow: 0 8px 24px rgba(34, 211, 238, 0.35);
    }
    .logo-text { font-size: 1.4rem; font-weight: 700; letter-spacing: -0.02em; }
    .copyright {
      position: absolute; bottom: 1.25rem; left: 0; right: 0;
      text-align: center; color: rgba(255, 255, 255, 0.55);
    }
    .login-card {
      width: 100%; padding: 2.5rem 2.25rem; border-radius: 20px; color: #0f172a; text-align: left;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(14px);
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.5);
    }
    .login-card h2 { margin: 0; font-size: 1.6rem; font-weight: 700; letter-spacing: -0.02em; text-align: center; }
    .hint { margin: 0.35rem 0 1.75rem; color: #64748b; text-align: center; }
    .full-width { width: 100%; }
    .login-btn { height: 50px; font-size: 1rem; font-weight: 600; margin-top: 0.75rem; }
    .error-message {
      color: #b91c1c; background: #fee2e2; border-radius: 10px;
      padding: 0.6rem 0.8rem; margin: 0.25rem 0 0.5rem; font-size: 0.85rem; text-align: center;
    }
    @media (max-width: 480px) {
      .login-card { padding: 2rem 1.5rem; }
    }
  `]
})
export class LoginComponent {
  readonly year = new Date().getFullYear();
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly hidePassword = signal(true);

  loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { username, password } = this.loginForm.value;
    this.authService.login({ username: username!, password: password! }).subscribe({
      next: res => {
        this.router.navigate([res.user.mustChangePassword ? '/change-password' : '/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Login failed. Please try again.');
      }
    });
  }
}
