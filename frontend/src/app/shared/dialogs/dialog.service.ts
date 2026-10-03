import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';
import { PromptDialogComponent, PromptDialogData } from './prompt-dialog.component';

/**
 * Shared dialogs.
 *   dialogs.confirm({ title, message, danger: true }).subscribe(ok => ...)
 *   dialogs.prompt({ title, label, type: 'number', required: true }).subscribe(value => ...)  // null when cancelled
 */
@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(MatDialog);

  confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog.open(ConfirmDialogComponent, { data, width: '440px', autoFocus: false }).afterClosed();
  }

  prompt(data: PromptDialogData): Observable<string | number | null> {
    return this.dialog.open(PromptDialogComponent, { data, width: '480px' }).afterClosed();
  }
}
