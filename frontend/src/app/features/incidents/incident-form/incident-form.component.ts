import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-incident-form',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `<h1>Report Incident</h1><mat-card><mat-card-content><p>Incident report form - to be implemented</p></mat-card-content></mat-card>`
})
export class IncidentFormComponent {}
