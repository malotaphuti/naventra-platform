import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-maintenance-list',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `<h1>Maintenance Work Orders</h1><mat-card><mat-card-content><p>Maintenance list - to be implemented</p></mat-card-content></mat-card>`
})
export class MaintenanceListComponent {}
