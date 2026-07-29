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
  selector: 'app-maintenance-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, MatPaginatorModule],
  template: `
    <div class="page-header">
      <h1>Maintenance Work Orders</h1>
      <button mat-raised-button color="primary" routerLink="new">
        <mat-icon>add</mat-icon> Create Work Order
      </button>
    </div>

    <table mat-table [dataSource]="orders()" class="mat-elevation-z2 full-width">
      <ng-container matColumnDef="workOrderNumber">
        <th mat-header-cell *matHeaderCellDef>Work Order #</th>
        <td mat-cell *matCellDef="let o">{{ o.workOrderNumber }}</td>
      </ng-container>

      <ng-container matColumnDef="vehicle">
        <th mat-header-cell *matHeaderCellDef>Vehicle</th>
        <td mat-cell *matCellDef="let o">{{ o.vehicleRegistration }}</td>
      </ng-container>

      <ng-container matColumnDef="type">
        <th mat-header-cell *matHeaderCellDef>Type</th>
        <td mat-cell *matCellDef="let o">{{ o.type }}</td>
      </ng-container>

      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let o"><mat-chip>{{ o.status }}</mat-chip></td>
      </ng-container>

      <ng-container matColumnDef="description">
        <th mat-header-cell *matHeaderCellDef>Description</th>
        <td mat-cell *matCellDef="let o">{{ o.description }}</td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let o">
          @if (o.status !== 'COMPLETED') {
            <button mat-icon-button (click)="complete(o.id)" aria-label="Complete" color="primary">
              <mat-icon>check_circle</mat-icon>
            </button>
          }
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns;"></tr>
    </table>

    <mat-paginator [length]="total()" [pageSize]="20" (page)="onPage($event)"></mat-paginator>

    @if (orders().length === 0) {
      <p style="text-align:center; color:#666; margin-top:2rem;">No work orders yet.</p>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .full-width { width: 100%; }
  `]
})
export class MaintenanceListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly orders = signal<any[]>([]);
  readonly total = signal(0);
  readonly columns = ['workOrderNumber', 'vehicle', 'type', 'status', 'description', 'actions'];
  page = 0;

  ngOnInit() { this.load(); }

  load() {
    const params = new HttpParams().set('page', this.page.toString()).set('size', '20');
    this.http.get<any>('/api/v1/maintenance', { params }).subscribe(r => {
      this.orders.set(r.content || []);
      this.total.set(r.totalElements || 0);
    });
  }

  complete(id: number) {
    this.http.put(`/api/v1/maintenance/${id}/complete`, {}).subscribe(() => this.load());
  }

  onPage(e: PageEvent) { this.page = e.pageIndex; this.load(); }
}
