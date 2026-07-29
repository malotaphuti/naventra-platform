import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `<h1>Trip Detail</h1><mat-card><mat-card-content><p>Trip detail view - to be implemented</p></mat-card-content></mat-card>`
})
export class TripDetailComponent {}
