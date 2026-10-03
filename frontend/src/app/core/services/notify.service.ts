import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** App-wide toast messages. */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 3500, panelClass: 'toast-success' });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 6000, panelClass: 'toast-error' });
  }
}
