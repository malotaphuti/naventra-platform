import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface DashboardData {
  totalVehicles: number;
  vehiclesAvailable: number;
  vehiclesOnTrip: number;
  vehiclesInMaintenance: number;
  vehiclesOutOfService: number;
  totalDrivers: number;
  activeDrivers: number;
  tripsToday: number;
  tripsInProgress: number;
  totalDistanceThisMonth: number;
  fuelCostThisMonth: number;
  maintenanceCostThisMonth: number;
  openIncidents: number;
  upcomingMaintenanceCount: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatGridListModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h1>Fleet Overview</h1>

    @if (loading()) {
      <div class="loading-container">
        <mat-spinner></mat-spinner>
      </div>
    } @else {
      <div class="kpi-grid">
        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-content">
              <mat-icon class="kpi-icon vehicles">directions_car</mat-icon>
              <div class="kpi-data">
                <span class="kpi-value">{{ data()?.totalVehicles ?? 0 }}</span>
                <span class="kpi-label">Total Vehicles</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-content">
              <mat-icon class="kpi-icon available">check_circle</mat-icon>
              <div class="kpi-data">
                <span class="kpi-value">{{ data()?.vehiclesAvailable ?? 0 }}</span>
                <span class="kpi-label">Available</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-content">
              <mat-icon class="kpi-icon on-trip">route</mat-icon>
              <div class="kpi-data">
                <span class="kpi-value">{{ data()?.vehiclesOnTrip ?? 0 }}</span>
                <span class="kpi-label">On Trip</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-content">
              <mat-icon class="kpi-icon maintenance">build</mat-icon>
              <div class="kpi-data">
                <span class="kpi-value">{{ data()?.vehiclesInMaintenance ?? 0 }}</span>
                <span class="kpi-label">In Maintenance</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-content">
              <mat-icon class="kpi-icon trips">today</mat-icon>
              <div class="kpi-data">
                <span class="kpi-value">{{ data()?.tripsToday ?? 0 }}</span>
                <span class="kpi-label">Trips Today</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-content">
              <mat-icon class="kpi-icon distance">straighten</mat-icon>
              <div class="kpi-data">
                <span class="kpi-value">{{ (data()?.totalDistanceThisMonth ?? 0) | number }} km</span>
                <span class="kpi-label">Distance This Month</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-content">
              <mat-icon class="kpi-icon fuel">local_gas_station</mat-icon>
              <div class="kpi-data">
                <span class="kpi-value">R{{ (data()?.fuelCostThisMonth ?? 0) | number:'1.0-0' }}</span>
                <span class="kpi-label">Fuel Cost This Month</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-content">
              <mat-icon class="kpi-icon incidents">warning</mat-icon>
              <div class="kpi-data">
                <span class="kpi-value">{{ data()?.openIncidents ?? 0 }}</span>
                <span class="kpi-label">Open Incidents</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    h1 { margin-bottom: 1.5rem; color: #333; }
    .loading-container { display: flex; justify-content: center; padding: 4rem; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }
    .kpi-card { transition: transform 0.2s; }
    .kpi-card:hover { transform: translateY(-2px); }
    .kpi-content { display: flex; align-items: center; gap: 1rem; padding: 0.5rem; }
    .kpi-icon { font-size: 2.5rem; width: 40px; height: 40px; }
    .kpi-icon.vehicles { color: #1a237e; }
    .kpi-icon.available { color: #2e7d32; }
    .kpi-icon.on-trip { color: #1565c0; }
    .kpi-icon.maintenance { color: #f57c00; }
    .kpi-icon.trips { color: #6a1b9a; }
    .kpi-icon.distance { color: #00838f; }
    .kpi-icon.fuel { color: #c62828; }
    .kpi-icon.incidents { color: #e65100; }
    .kpi-data { display: flex; flex-direction: column; }
    .kpi-value { font-size: 1.8rem; font-weight: 700; color: #333; }
    .kpi-label { font-size: 0.85rem; color: #666; }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly loading = signal(true);
  readonly data = signal<DashboardData | null>(null);

  ngOnInit(): void {
    this.http.get<DashboardData>('/api/v1/dashboard/overview').subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
