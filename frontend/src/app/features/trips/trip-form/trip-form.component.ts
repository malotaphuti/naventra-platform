import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-trip-form',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `<h1>Request Trip</h1><mat-card><mat-card-content><p>Trip request form - to be implemented</p></mat-card-content></mat-card>`
})
export class TripFormComponent {}
