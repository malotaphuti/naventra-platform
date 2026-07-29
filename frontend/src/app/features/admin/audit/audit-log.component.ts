import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `<h1>Audit Logs</h1><mat-card><mat-card-content><p>Audit log viewer - to be implemented</p></mat-card-content></mat-card>`
})
export class AuditLogComponent {}
