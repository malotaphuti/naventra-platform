import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-driver-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatPaginatorModule, MatFormFieldModule, MatInputModule
  ],
  template: `
    <div class="page-header">
      <h1>Drivers</h1>
      <button mat-raised-button color="primary" routerLink="new">
        <mat-icon>add</mat-icon> Register Driver
      </button>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline">
        <mat-label>Search</mat-label>
        <input matInput [(ngModel)]="searchTerm" (keyup.enter)="loadDrivers()" placeholder="Employee number, license...">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
    </div>

    <table mat-table [dataSource]="drivers()" class="mat-elevation-z2 full-width">
      <ng-container matColumnDef="employeeNumber">
        <th mat-header-cell *matHeaderCellDef>Employee #</th>
        <td mat-cell *matCellDef="let d">{{ d.employeeNumber }}</td>
      </ng-container>

      <ng-container matColumnDef="fullName">
        <th mat-header-cell *matHeaderCellDef>Full Name</th>
        <td mat-cell *matCellDef="let d">{{ d.fullName }}</td>
      </ng-container>

      <ng-container matColumnDef="licenseNumber">
        <th mat-header-cell *matHeaderCellDef>License #</th>
        <td mat-cell *matCellDef="let d">{{ d.licenseNumber }}</td>
      </ng-container>

      <ng-container matColumnDef="licenseExpiry">
        <th mat-header-cell *matHeaderCellDef>License Expiry</th>
        <td mat-cell *matCellDef="let d">{{ d.licenseExpiryDate }}</td>
      </ng-container>

      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let d"><mat-chip>{{ d.status }}</mat-chip></td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let d">
          <button mat-icon-button [routerLink]="[d.id]" aria-label="View"><mat-icon>visibility</mat-icon></button>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns;"></tr>
    </table>

    <mat-paginator [length]="total()" [pageSize]="20" (page)="onPage($event)"></mat-paginator>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .filters { margin-bottom: 1rem; }
    .full-width { width: 100%; }
  `]
})
export class DriverListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly drivers = signal<any[]>([]);
  readonly total = signal(0);
  readonly columns = ['employeeNumber', 'fullName', 'licenseNumber', 'licenseExpiry', 'status', 'actions'];
  searchTerm = '';
  page = 0;

  ngOnInit() { this.loadDrivers(); }

  loadDrivers() {
    let params = new HttpParams().set('page', this.page.toString()).set('size', '20');
    if (this.searchTerm) params = params.set('search', this.searchTerm);
    this.http.get<any>('/api/v1/drivers', { params }).subscribe(r => {
      this.drivers.set(r.content);
      this.total.set(r.totalElements);
    });
  }

  onPage(e: PageEvent) { this.page = e.pageIndex; this.loadDrivers(); }
}
