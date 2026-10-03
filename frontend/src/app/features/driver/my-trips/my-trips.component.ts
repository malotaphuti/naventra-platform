import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Page } from '../../../core/models/page.model';
import { humanize } from '../../dashboard/dashboard.models';
import { Trip } from '../../trips/trip.models';

@Component({
  selector: 'app-my-trips',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTableModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page-head">
      <div>
        <h1>My trips</h1>
        <p>Your trip requests and journeys.</p>
      </div>
      <div class="head-actions">
        <a mat-flat-button color="primary" routerLink="/my-trips/new"><mat-icon>add</mat-icon> Request trip</a>
      </div>
    </div>

    <div class="table-wrap">
      @if (loading()) {
        <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (trips().length === 0) {
        <div class="empty"><mat-icon>route</mat-icon>You have no trips yet. Request one to get started.</div>
      } @else {
        <table mat-table [dataSource]="trips()">
          <ng-container matColumnDef="tripNumber">
            <th mat-header-cell *matHeaderCellDef>Trip #</th>
            <td mat-cell *matCellDef="let t"><strong>{{ t.tripNumber }}</strong></td>
          </ng-container>
          <ng-container matColumnDef="route">
            <th mat-header-cell *matHeaderCellDef>Route</th>
            <td mat-cell *matCellDef="let t">{{ t.origin }} → {{ t.destination }}</td>
          </ng-container>
          <ng-container matColumnDef="vehicle">
            <th mat-header-cell *matHeaderCellDef>Vehicle</th>
            <td mat-cell *matCellDef="let t">{{ t.vehicleRegistration }}</td>
          </ng-container>
          <ng-container matColumnDef="requested">
            <th mat-header-cell *matHeaderCellDef>Requested</th>
            <td mat-cell *matCellDef="let t">{{ t.requestedAt | date:'d MMM y, HH:mm' }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let t"><span class="pill" [attr.data-status]="t.status">{{ label(t.status) }}</span></td>
          </ng-container>
          <ng-container matColumnDef="distance">
            <th mat-header-cell *matHeaderCellDef>Distance</th>
            <td mat-cell *matCellDef="let t">{{ t.distanceKm != null ? (t.distanceKm | number) + ' km' : '—' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns" class="clickable" (click)="open(row)"></tr>
        </table>
      }
    </div>
  `
})
export class MyTripsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly trips = signal<Trip[]>([]);
  readonly columns = ['tripNumber', 'route', 'vehicle', 'requested', 'status', 'distance'];
  readonly label = humanize;

  ngOnInit(): void {
    // The backend scopes DRIVER searches to their own trips
    this.http.get<Page<Trip>>('/api/v1/trips?size=50&sort=id,desc').subscribe({
      next: r => {
        this.trips.set(r.content ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  open(t: Trip): void {
    this.router.navigate(['/my-trips', t.id]);
  }
}
