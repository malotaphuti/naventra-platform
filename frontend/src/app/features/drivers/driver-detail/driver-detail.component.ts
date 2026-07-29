import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-driver-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `<h1>Driver Detail</h1><mat-card><mat-card-content><p>Driver detail - to be implemented</p></mat-card-content></mat-card>`
})
export class DriverDetailComponent {}
