import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../../../core/stores/auth.store';
import { Page } from '../../../core/models/page.model';
import { expiryTone, humanize } from '../../dashboard/dashboard.models';
import { VEHICLE_STATUSES, Vehicle } from '../vehicle.models';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Vehicles</h1>
        <p>The fleet register: status, assignment and compliance.</p>
      </div>
      @if (canCreate) {
        <div class="head-actions">
          <a mat-flat-button color="primary" routerLink="new"><mat-icon>add</mat-icon> Add vehicle</a>
        </div>
      }
    </div>

    <div class="filters">
      <mat-form-field appearance="outline" class="grow">
        <mat-label>Search</mat-label>
        <input matInput [(ngModel)]="search" (keyup.enter)="reload()" placeholder="Registration, make, model, VIN">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Status</mat-label>
        <mat-select [(ngModel)]="status" (selectionChange)="reload()">
          <mat-option [value]="null">All statuses</mat-option>
          @for (s of statuses; track s) { <mat-option [value]="s">{{ label(s) }}</mat-option> }
        </mat-select>
      </mat-form-field>
    </div>

    <div class="table-wrap">
      <table mat-table [dataSource]="vehicles()">
        <ng-container matColumnDef="registration">
          <th mat-header-cell *matHeaderCellDef>Registration</th>
          <td mat-cell *matCellDef="let v"><strong>{{ v.registrationNumber }}</strong></td>
        </ng-container>
        <ng-container matColumnDef="vehicle">
          <th mat-header-cell *matHeaderCellDef>Vehicle</th>
          <td mat-cell *matCellDef="let v">{{ v.make }} {{ v.model }} <span class="sub">{{ v.year }}</span></td>
        </ng-container>
        <ng-container matColumnDef="driver">
          <th mat-header-cell *matHeaderCellDef>Driver</th>
          <td mat-cell *matCellDef="let v">{{ v.assignedDriverName || '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="odometer">
          <th mat-header-cell *matHeaderCellDef>Odometer</th>
          <td mat-cell *matCellDef="let v">{{ v.currentOdometerKm | number }} km</td>
        </ng-container>
        <ng-container matColumnDef="licence">
          <th mat-header-cell *matHeaderCellDef>Licence disc</th>
          <td mat-cell *matCellDef="let v">
            @if (v.licenseExpiryDate) {
              <span class="pill" [ngClass]="tone(v.licenseExpiryDate)">{{ v.licenseExpiryDate | date:'d MMM y' }}</span>
            } @else { — }
          </td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let v"><span class="pill" [attr.data-status]="v.status">{{ label(v.status) }}</span></td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns" class="clickable" (click)="open(row)"></tr>
      </table>
      @if (loading()) {
        <div class="loading-container"><mat-spinner diameter="36"></mat-spinner></div>
      } @else if (!vehicles().length) {
        <div class="empty"><mat-icon>directions_car</mat-icon>No vehicles match your filters.</div>
      }
      <mat-paginator [length]="total()" [pageIndex]="page" [pageSize]="size" [pageSizeOptions]="[10, 20, 50]"
                     (page)="onPage($event)"></mat-paginator>
    </div>
  `,
  styles: [`.sub { color: var(--fo-muted); font-size: 0.8rem; }`]
})
export class VehicleListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);

  readonly vehicles = signal<Vehicle[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly columns = ['registration', 'vehicle', 'driver', 'odometer', 'licence', 'status'];
  readonly statuses = VEHICLE_STATUSES;
  readonly canCreate = this.authStore.hasAnyRole(['SYSTEM_ADMIN', 'FLEET_MANAGER']);
  readonly label = humanize;
  readonly tone = expiryTone;

  search = '';
  status: string | null = null;
  page = 0;
  size = 20;

  ngOnInit(): void { this.load(); }

  reload(): void {
    this.page = 0;
    this.load();
  }

  load(): void {
    let params = new HttpParams().set('page', this.page).set('size', this.size).set('sort', 'registrationNumber,asc');
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.status) params = params.set('status', this.status);
    this.loading.set(true);
    this.http.get<Page<Vehicle>>('/api/v1/vehicles', { params }).subscribe({
      next: r => {
        this.vehicles.set(r.content);
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

  open(v: Vehicle): void {
    this.router.navigate(['/vehicles', v.id]);
  }
}
