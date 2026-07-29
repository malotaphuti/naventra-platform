import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-maintenance-form',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `<h1>Create Work Order</h1><mat-card><mat-card-content><p>Work order form - to be implemented</p></mat-card-content></mat-card>`
})
export class MaintenanceFormComponent {}
