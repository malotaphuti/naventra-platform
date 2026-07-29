import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `<h1>User Management</h1><mat-card><mat-card-content><p>User management - to be implemented</p></mat-card-content></mat-card>`
})
export class UserListComponent {}
