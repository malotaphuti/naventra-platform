import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Page } from '../../../core/models/page.model';
import { expiryTone, humanize } from '../../dashboard/dashboard.models';
import { DRIVER_STATUSES, Driver } from '../driver.models';

@Component({
  selector: 'app-driver-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatPaginatorModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Drivers</h1>
        <p>Driver profiles, licences and vehicle assignments.</p>
      </div>
      <div class="head-actions">
        <a mat-flat-button color="primary" routerLink="new"><mat-icon>person_add</mat-icon> Register driver</a>
      </div>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline" class="grow">
        <mat-label>Search</mat-label>
        <input matInput [(ngModel)]="search" (keyup.enter)="reload()" placeholder="Name, employee or licence number">
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
      <table mat-table [dataSource]="drivers()">
        <ng-container matColumnDef="fullName">
          <th mat-header-cell *matHeaderCellDef>Driver</th>
          <td mat-cell *matCellDef="let d"><strong>{{ d.fullName }}</strong><div class="sub">{{ d.email }}</div></td>
        </ng-container>
        <ng-container matColumnDef="employeeNumber">
          <th mat-header-cell *matHeaderCellDef>Employee #</th>
          <td mat-cell *matCellDef="let d">{{ d.employeeNumber }}</td>
        </ng-container>
        <ng-container matColumnDef="licence">
          <th mat-header-cell *matHeaderCellDef>Licence</th>
          <td mat-cell *matCellDef="let d">{{ d.licenseNumber }}{{ d.licenseClass ? ' · ' + d.licenseClass : '' }}</td>
        </ng-container>
        <ng-container matColumnDef="expiry">
          <th mat-header-cell *matHeaderCellDef>Licence expiry</th>
          <td mat-cell *matCellDef="let d">
            <span class="pill" [ngClass]="tone(d.licenseExpiryDate)">{{ d.licenseExpiryDate | date:'d MMM y' }}</span>
          </td>
        </ng-container>
        <ng-container matColumnDef="vehicle">
          <th mat-header-cell *matHeaderCellDef>Vehicle</th>
          <td mat-cell *matCellDef="let d">{{ d.assignedVehicleRegistration || '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let d"><span class="pill" [attr.data-status]="d.status">{{ label(d.status) }}</span></td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns" class="clickable" (click)="open(row)"></tr>
      </table>
      @if (loading()) {
        <div class="loading-container"><mat-spinner diameter="36"></mat-spinner></div>
      } @else if (!drivers().length) {
        <div class="empty"><mat-icon>badge</mat-icon>No drivers match your filters.</div>
      }
      <mat-paginator [length]="total()" [pageIndex]="page" [pageSize]="size" [pageSizeOptions]="[10, 20, 50]"
                     (page)="onPage($event)"></mat-paginator>
    </div>
  `,
  styles: [`.sub { font-size: 0.78rem; color: var(--fo-muted); }`]
})
export class DriverListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly drivers = signal<Driver[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly columns = ['fullName', 'employeeNumber', 'licence', 'expiry', 'vehicle', 'status'];
  readonly statuses = DRIVER_STATUSES;
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
    let params = new HttpParams().set('page', this.page).set('size', this.size).set('sort', 'employeeNumber,asc');
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.status) params = params.set('status', this.status);
    this.loading.set(true);
    this.http.get<Page<Driver>>('/api/v1/drivers', { params }).subscribe({
      next: r => {
        this.drivers.set(r.content);
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

  open(d: Driver): void {
    this.router.navigate(['/drivers', d.id]);
  }
}
