import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-fuel-form',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `<h1>Record Fuel Entry</h1><mat-card><mat-card-content><p>Fuel form - to be implemented</p></mat-card-content></mat-card>`
})
export class FuelFormComponent {}
