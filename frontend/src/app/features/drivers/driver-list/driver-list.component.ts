import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-driver-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-header">
      <h1>Drivers</h1>
      <button mat-raised-button color="primary" routerLink="new">
        <mat-icon>add</mat-icon> Register Driver
      </button>
    </div>
    <mat-card><mat-card-content><p>Driver list with search, filter, pagination - to be implemented</p></mat-card-content></mat-card>
  `,
  styles: [`.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }`]
})
export class DriverListComponent {}
