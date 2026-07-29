import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../../core/stores/auth.store';

interface Vehicle {
  id: number;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  status: string;
  fuelType: string;
  currentOdometerKm: number;
}

interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatPaginatorModule, MatChipsModule
  ],
  template: `
    <div class="page-header">
      <h1>Vehicles</h1>
      @if (canRegister()) {
        <button mat-raised-button color="primary" routerLink="new">
          <mat-icon>add</mat-icon> Register Vehicle
        </button>
      }
    </div>

    <div class="filters">
      <mat-form-field appearance="outline">
        <mat-label>Search</mat-label>
        <input matInput [(ngModel)]="searchTerm" (keyup.enter)="search()" placeholder="Registration, make, model...">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Status</mat-label>
        <mat-select [(ngModel)]="statusFilter" (selectionChange)="search()">
          <mat-option [value]="null">All</mat-option>
          <mat-option value="AVAILABLE">Available</mat-option>
          <mat-option value="ON_TRIP">On Trip</mat-option>
          <mat-option value="MAINTENANCE">Maintenance</mat-option>
          <mat-option value="OUT_OF_SERVICE">Out of Service</mat-option>
          <mat-option value="RETIRED">Retired</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <table mat-table [dataSource]="vehicles()" class="mat-elevation-z2 full-width">
      <ng-container matColumnDef="registrationNumber">
        <th mat-header-cell *matHeaderCellDef>Registration</th>
        <td mat-cell *matCellDef="let v">{{ v.registrationNumber }}</td>
      </ng-container>

      <ng-container matColumnDef="make">
        <th mat-header-cell *matHeaderCellDef>Make</th>
        <td mat-cell *matCellDef="let v">{{ v.make }}</td>
      </ng-container>

      <ng-container matColumnDef="model">
        <th mat-header-cell *matHeaderCellDef>Model</th>
        <td mat-cell *matCellDef="let v">{{ v.model }} ({{ v.year }})</td>
      </ng-container>

      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let v">
          <mat-chip [class]="'status-' + v.status.toLowerCase()">{{ v.status }}</mat-chip>
        </td>
      </ng-container>

      <ng-container matColumnDef="odometer">
        <th mat-header-cell *matHeaderCellDef>Odometer</th>
        <td mat-cell *matCellDef="let v">{{ v.currentOdometerKm | number }} km</td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let v">
          <button mat-icon-button [routerLink]="[v.id]" aria-label="View vehicle">
            <mat-icon>visibility</mat-icon>
          </button>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>

    <mat-paginator
      [length]="totalElements()"
      [pageSize]="20"
      [pageSizeOptions]="[10, 20, 50]"
      (page)="onPageChange($event)">
    </mat-paginator>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .filters { display: flex; gap: 1rem; margin-bottom: 1rem; }
    .full-width { width: 100%; }
    .status-available { background: #c8e6c9 !important; }
    .status-on_trip { background: #bbdefb !important; }
    .status-maintenance { background: #ffe0b2 !important; }
    .status-out_of_service { background: #ffcdd2 !important; }
    .status-retired { background: #e0e0e0 !important; }
  `]
})
export class VehicleListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);

  readonly vehicles = signal<Vehicle[]>([]);
  readonly totalElements = signal(0);
  readonly displayedColumns = ['registrationNumber', 'make', 'model', 'status', 'odometer', 'actions'];
  readonly canRegister = computed(() => this.authStore.hasAnyRole(['SYSTEM_ADMIN', 'FLEET_MANAGER']));

  searchTerm = '';
  statusFilter: string | null = null;
  page = 0;
  size = 20;

  ngOnInit(): void {
    this.search();
  }

  search(): void {
    let params = new HttpParams()
      .set('page', this.page.toString())
      .set('size', this.size.toString());

    if (this.searchTerm) params = params.set('search', this.searchTerm);
    if (this.statusFilter) params = params.set('status', this.statusFilter);

    this.http.get<Page<Vehicle>>('/api/v1/vehicles', { params }).subscribe(response => {
      this.vehicles.set(response.content);
      this.totalElements.set(response.totalElements);
    });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.search();
  }
}
