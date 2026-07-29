import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-fuel-list',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `<h1>Fuel Entries</h1><mat-card><mat-card-content><p>Fuel entries list - to be implemented</p></mat-card-content></mat-card>`
})
export class FuelListComponent {}
