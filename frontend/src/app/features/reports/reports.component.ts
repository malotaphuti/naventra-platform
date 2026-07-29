import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <h1>Reports</h1>
    <div class="report-grid">
      @for (report of reports; track report.title) {
        <mat-card class="report-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>{{ report.icon }}</mat-icon>
            <mat-card-title>{{ report.title }}</mat-card-title>
            <mat-card-subtitle>{{ report.description }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-actions>
            <button mat-button color="primary">
              <mat-icon>picture_as_pdf</mat-icon> PDF
            </button>
            <button mat-button color="accent">
              <mat-icon>table_chart</mat-icon> Excel
            </button>
            <button mat-button>
              <mat-icon>download</mat-icon> CSV
            </button>
          </mat-card-actions>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .report-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .report-card { margin-bottom: 1rem; }
  `]
})
export class ReportsComponent {
  reports = [
    { title: 'Fleet Utilization', description: 'Vehicle usage and availability metrics', icon: 'pie_chart' },
    { title: 'Driver Performance', description: 'Trip completion and fuel efficiency per driver', icon: 'people' },
    { title: 'Maintenance History', description: 'Service records and cost breakdown', icon: 'build' },
    { title: 'Fuel Consumption', description: 'Fuel usage trends and cost analysis', icon: 'local_gas_station' },
    { title: 'Trip Summary', description: 'Trip statistics and route analysis', icon: 'route' },
    { title: 'Vehicle Downtime', description: 'Time spent in maintenance or out of service', icon: 'timer_off' },
    { title: 'Incident Report', description: 'Incident frequency and resolution times', icon: 'warning' },
    { title: 'Cost Analysis', description: 'Total cost of ownership breakdown', icon: 'attach_money' }
  ];
}
