import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-fuel-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTableModule, MatButtonModule, MatIconModule, MatPaginatorModule],
  template: `
    <div class="page-header">
      <h1>Fuel Entries</h1>
      <button mat-raised-button color="primary" routerLink="new">
        <mat-icon>add</mat-icon> Record Fuel
      </button>
    </div>

    <table mat-table [dataSource]="entries()" class="mat-elevation-z2 full-width">
      <ng-container matColumnDef="filledAt">
        <th mat-header-cell *matHeaderCellDef>Date</th>
        <td mat-cell *matCellDef="let e">{{ e.filledAt | date:'short' }}</td>
      </ng-container>

      <ng-container matColumnDef="vehicle">
        <th mat-header-cell *matHeaderCellDef>Vehicle</th>
        <td mat-cell *matCellDef="let e">{{ e.vehicleRegistration }}</td>
      </ng-container>

      <ng-container matColumnDef="driver">
        <th mat-header-cell *matHeaderCellDef>Driver</th>
        <td mat-cell *matCellDef="let e">{{ e.driverName }}</td>
      </ng-container>

      <ng-container matColumnDef="litres">
        <th mat-header-cell *matHeaderCellDef>Litres</th>
        <td mat-cell *matCellDef="let e">{{ e.litres | number:'1.1-1' }} L</td>
      </ng-container>

      <ng-container matColumnDef="totalCost">
        <th mat-header-cell *matHeaderCellDef>Total Cost</th>
        <td mat-cell *matCellDef="let e">R{{ e.totalCost | number:'1.2-2' }}</td>
      </ng-container>

      <ng-container matColumnDef="odometer">
        <th mat-header-cell *matHeaderCellDef>Odometer</th>
        <td mat-cell *matCellDef="let e">{{ e.odometerReadingKm | number }} km</td>
      </ng-container>

      <ng-container matColumnDef="station">
        <th mat-header-cell *matHeaderCellDef>Station</th>
        <td mat-cell *matCellDef="let e">{{ e.station || '-' }}</td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns;"></tr>
    </table>

    <mat-paginator [length]="total()" [pageSize]="20" (page)="onPage($event)"></mat-paginator>

    @if (entries().length === 0) {
      <p style="text-align:center; color:#666; margin-top:2rem;">No fuel entries recorded yet.</p>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .full-width { width: 100%; }
  `]
})
export class FuelListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly entries = signal<any[]>([]);
  readonly total = signal(0);
  readonly columns = ['filledAt', 'vehicle', 'driver', 'litres', 'totalCost', 'odometer', 'station'];
  page = 0;

  ngOnInit() { this.load(); }

  load() {
    const params = new HttpParams().set('page', this.page.toString()).set('size', '20');
    this.http.get<any>('/api/v1/fuel', { params }).subscribe(r => {
      this.entries.set(r.content || []);
      this.total.set(r.totalElements || 0);
    });
  }

  onPage(e: PageEvent) { this.page = e.pageIndex; this.load(); }
}
