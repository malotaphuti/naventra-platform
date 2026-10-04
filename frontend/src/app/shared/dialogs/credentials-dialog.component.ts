import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** How the backend delivered a temporary password (create user / reset password / new driver login). */
export interface CredentialsDelivery {
  credentialsEmailed: boolean;
  emailedTo?: string;
  temporaryPassword?: string;
  temporaryPasswordExpiresAt?: string;
}

export interface CredentialsDialogData {
  username: string;
  fullName: string;
  credentials: CredentialsDelivery;
  reset?: boolean;
}

/**
 * Tells the administrator how the user gets their sign-in details. When e-mail couldn't be sent,
 * shows the temporary password once so it can be passed on - it isn't stored anywhere.
 */
@Component({
  selector: 'app-credentials-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ data.reset ? 'Password reset' : 'Account created' }}</h2>
    <mat-dialog-content>
      @if (c.credentialsEmailed) {
        <div class="box ok">
          <mat-icon>mark_email_read</mat-icon>
          <div>
            Sign-in details for <b>{{ data.fullName }}</b> were e-mailed to <b>{{ c.emailedTo }}</b>.
            They'll be asked to choose their own password the first time they log in.
          </div>
        </div>
      } @else {
        <div class="box warn">
          <mat-icon>warning</mat-icon>
          <div>
            The e-mail could not be sent, so share these details with <b>{{ data.fullName }}</b> yourself
            (in person or by phone). <b>This is the only time the password is shown.</b>
          </div>
        </div>
        <dl>
          <dt>Username</dt><dd><code>{{ data.username }}</code></dd>
          <dt>Temporary password</dt>
          <dd>
            <code class="pw">{{ c.temporaryPassword }}</code>
            <button mat-stroked-button type="button" (click)="copy()">
              <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>{{ copied() ? 'Copied' : 'Copy' }}
            </button>
          </dd>
        </dl>
      }
      @if (c.temporaryPasswordExpiresAt) {
        <p class="muted">The temporary password expires on {{ c.temporaryPasswordExpiresAt | date:'d MMM y, HH:mm' }}.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" mat-dialog-close>Done</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .box { display: flex; gap: 0.75rem; padding: 0.85rem 1rem; border-radius: 10px; line-height: 1.5; }
    .box mat-icon { flex: none; }
    .box.ok { background: #f0fdf4; color: #14532d; }
    .box.warn { background: #fffbeb; color: #78350f; }
    dl { margin: 1rem 0 0; display: grid; grid-template-columns: auto 1fr; gap: 0.6rem 1rem; align-items: center; }
    dt { color: var(--fo-muted); font-size: 0.85rem; }
    dd { margin: 0; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    code { font-family: Consolas, monospace; font-size: 0.95rem; }
    .pw { font-size: 1.1rem; font-weight: 700; letter-spacing: 0.04em; background: #f1f5f9; padding: 0.2rem 0.5rem; border-radius: 6px; }
    .muted { color: var(--fo-muted); font-size: 0.85rem; margin: 1rem 0 0; }
  `]
})
export class CredentialsDialogComponent {
  readonly data = inject<CredentialsDialogData>(MAT_DIALOG_DATA);
  readonly c = this.data.credentials;
  readonly copied = signal(false);

  copy(): void {
    navigator.clipboard?.writeText(this.c.temporaryPassword ?? '').then(() => this.copied.set(true));
  }
}
