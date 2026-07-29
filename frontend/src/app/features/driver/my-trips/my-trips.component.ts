import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-my-trips',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatCardModule,
    MatChipsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <h1>My Trips</h1>

    @if (loading()) {
      <mat-spinner diameter="40"></mat-spinner>
    } @else {
      <table mat-table [dataSource]="trips()" class="mat-elevation-z2 full-width">
        <ng-container matColumnDef="tripNumber">
          <th mat-header-cell *matHeaderCellDef>Trip #</th>
          <td mat-cell *matCellDef="let t">{{ t.tripNumber }}</td>
        </ng-container>

        <ng-container matColumnDef="route">
          <th mat-header-cell *matHeaderCellDef>Route</th>
          <td mat-cell *matCellDef="let t">{{ t.origin }} → {{ t.destination }}</td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let t">
            <mat-chip>{{ t.status }}</mat-chip>
          </td>
        </ng-container>

        <ng-container matColumnDef="distance">
          <th mat-header-cell *matHeaderCellDef>Distance</th>
          <td mat-cell *matCellDef="let t">{{ t.distanceKm ? (t.distanceKm | number) + ' km' : '-' }}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      @if (trips().length === 0) {
        <mat-card>
          <mat-card-content>
            <p>No trips assigned to you yet.</p>
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: [`.full-width { width: 100%; }`]
})
export class MyTripsComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly loading = signal(true);
  readonly trips = signal<any[]>([]);
  readonly displayedColumns = ['tripNumber', 'route', 'status', 'distance'];

  ngOnInit(): void {
    // Fetch only the current driver's trips
    this.http.get<any>('/api/v1/trips?size=50').subscribe({
      next: (response) => {
        this.trips.set(response.content || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
