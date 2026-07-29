import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-trip-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, MatPaginatorModule
  ],
  template: `
    <div class="page-header">
      <h1>Trips</h1>
      <button mat-raised-button color="primary" routerLink="new">
        <mat-icon>add</mat-icon> Request Trip
      </button>
    </div>

    <table mat-table [dataSource]="trips()" class="mat-elevation-z2 full-width">
      <ng-container matColumnDef="tripNumber">
        <th mat-header-cell *matHeaderCellDef>Trip #</th>
        <td mat-cell *matCellDef="let t">{{ t.tripNumber }}</td>
      </ng-container>

      <ng-container matColumnDef="vehicle">
        <th mat-header-cell *matHeaderCellDef>Vehicle</th>
        <td mat-cell *matCellDef="let t">{{ t.vehicleRegistration }}</td>
      </ng-container>

      <ng-container matColumnDef="origin">
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

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let t">
          <button mat-icon-button [routerLink]="[t.id]" aria-label="View trip">
            <mat-icon>visibility</mat-icon>
          </button>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>

    <mat-paginator [length]="totalElements()" [pageSize]="20" (page)="onPageChange($event)">
    </mat-paginator>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .full-width { width: 100%; }
  `]
})
export class TripListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly trips = signal<any[]>([]);
  readonly totalElements = signal(0);
  readonly displayedColumns = ['tripNumber', 'vehicle', 'origin', 'status', 'distance', 'actions'];
  page = 0;

  ngOnInit(): void { this.loadTrips(); }

  loadTrips(): void {
    const params = new HttpParams().set('page', this.page.toString()).set('size', '20');
    this.http.get<any>('/api/v1/trips', { params }).subscribe(r => {
      this.trips.set(r.content);
      this.totalElements.set(r.totalElements);
    });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex;
    this.loadTrips();
  }
}
