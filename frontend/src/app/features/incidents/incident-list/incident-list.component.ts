import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-incident-list',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `<h1>Incidents</h1><mat-card><mat-card-content><p>Incident list - to be implemented</p></mat-card-content></mat-card>`
})
export class IncidentListComponent {}
