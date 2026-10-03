import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, debounceTime } from 'rxjs';
import { AuthStore } from '../../../core/stores/auth.store';
import { Page } from '../../../core/models/page.model';
import { humanize } from '../../dashboard/dashboard.models';
import { TRIP_MANAGER_ROLES, TRIP_STATUSES, Trip } from '../trip.models';

@Component({
  selector: 'app-trip-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatPaginatorModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Trips</h1>
        <p>Trip requests, approvals and journeys across the fleet.</p>
      </div>
      @if (canCreate) {
        <div class="head-actions">
          <a mat-flat-button color="primary" routerLink="/trips/new">
            <mat-icon>add</mat-icon> Request trip
          </a>
        </div>
      }
    </div>

    <div class="filters">
      <mat-form-field appearance="outline" class="grow">
        <mat-label>Search</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [(ngModel)]="search" (ngModelChange)="searchChanged.next()"
               placeholder="Trip number, origin or destination">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Status</mat-label>
        <mat-select [(ngModel)]="status" (selectionChange)="reload()">
          <mat-option value="">All statuses</mat-option>
          @for (s of statuses; track s) {
            <mat-option [value]="s">{{ label(s) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    <div class="table-wrap">
      @if (loading()) {
        <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (trips().length === 0) {
        <div class="empty"><mat-icon>route</mat-icon>No trips match your filters.</div>
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
          <ng-container matColumnDef="driver">
            <th mat-header-cell *matHeaderCellDef>Driver</th>
            <td mat-cell *matCellDef="let t">{{ t.driverName || '—' }}</td>
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
      <mat-paginator [length]="total()" [pageIndex]="page" [pageSize]="size"
                     [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>
    </div>
  `
})
export class TripListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly trips = signal<Trip[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly columns = ['tripNumber', 'route', 'driver', 'vehicle', 'requested', 'status', 'distance'];
  readonly statuses = TRIP_STATUSES;
  readonly canCreate = this.auth.hasAnyRole(TRIP_MANAGER_ROLES);
  readonly searchChanged = new Subject<void>();
  readonly label = humanize;

  search = '';
  status = '';
  page = 0;
  size = 20;

  ngOnInit(): void {
    this.searchChanged.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload());
    this.load();
  }

  reload(): void {
    this.page = 0;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    let params = new HttpParams()
      .set('page', this.page)
      .set('size', this.size)
      .set('sort', 'id,desc');
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.status) params = params.set('status', this.status);

    this.http.get<Page<Trip>>('/api/v1/trips', { params }).subscribe({
      next: r => {
        this.trips.set(r.content);
        this.total.set(r.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex;
    this.size = e.pageSize;
    this.load();
  }

  open(t: Trip): void {
    this.router.navigate(['/trips', t.id]);
  }
}
