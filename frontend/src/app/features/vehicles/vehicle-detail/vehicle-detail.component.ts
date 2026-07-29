import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatChipsModule, MatIconModule],
  template: `
    <div class="page-header">
      <h1>Vehicle Details</h1>
      <button mat-button routerLink="/vehicles">
        <mat-icon>arrow_back</mat-icon> Back to List
      </button>
    </div>

    @if (vehicle()) {
      <mat-card>
        <mat-card-header>
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
              <label>VIN</label>
              <span>{{ vehicle()!.vin || 'N/A' }}</span>
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
              <label>License Expiry</label>
              <span>{{ vehicle()!.licenseExpiryDate || 'Not set' }}</span>
            </div>
            <div class="detail-item">
              <label>Insurance Expiry</label>
              <span>{{ vehicle()!.insuranceExpiryDate || 'Not set' }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; padding: 1rem 0; }
    .detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
    .detail-item label { font-size: 0.8rem; color: #666; text-transform: uppercase; }
    .detail-item span { font-size: 1.1rem; }
  `]
})
export class VehicleDetailComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  readonly vehicle = signal<any>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.http.get(`/api/v1/vehicles/${id}`).subscribe(v => this.vehicle.set(v));
  }
}
