import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-my-vehicle',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatChipsModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <h1>My Assigned Vehicle</h1>

    @if (loading()) {
      <mat-spinner diameter="40"></mat-spinner>
    } @else if (vehicle()) {
      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>directions_car</mat-icon>
          <mat-card-title>{{ vehicle()!.registrationNumber }}</mat-card-title>
          <mat-card-subtitle>{{ vehicle()!.make }} {{ vehicle()!.model }} ({{ vehicle()!.year }})</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Status</label>
              <mat-chip>{{ vehicle()!.status }}</mat-chip>
            </div>
            <div class="detail-item">
              <label>Fuel Type</label>
              <span>{{ vehicle()!.fuelType || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <label>Odometer</label>
              <span>{{ vehicle()!.currentOdometerKm | number }} km</span>
            </div>
            <div class="detail-item">
              <label>Color</label>
              <span>{{ vehicle()!.color || 'N/A' }}</span>
            </div>
            <div class="detail-item">
              <label>License Expiry</label>
              <span>{{ vehicle()!.licenseExpiryDate || 'Not set' }}</span>
            </div>
            <div class="detail-item">
              <label>Next Service</label>
              <span>{{ vehicle()!.nextServiceDate || 'Not set' }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    } @else {
      <mat-card>
        <mat-card-content>
          <p>No vehicle currently assigned to you. Contact your Fleet Manager.</p>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      padding: 1rem 0;
    }
    .detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
    .detail-item label { font-size: 0.8rem; color: #666; text-transform: uppercase; }
    .detail-item span { font-size: 1.1rem; }
  `]
})
export class MyVehicleComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly loading = signal(true);
  readonly vehicle = signal<any>(null);

  ngOnInit(): void {
    // TODO: Add backend endpoint GET /api/v1/drivers/me/vehicle
    // For now show empty state
    this.loading.set(false);
  }
}
