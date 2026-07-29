import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-driver-form',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `<h1>Register Driver</h1><mat-card><mat-card-content><p>Driver form - to be implemented</p></mat-card-content></mat-card>`
})
export class DriverFormComponent {}
