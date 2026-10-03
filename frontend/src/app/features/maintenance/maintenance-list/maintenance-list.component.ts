import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, merge } from 'rxjs';
import { Page } from '../../../core/models/page.model';
import { AuthStore } from '../../../core/stores/auth.store';
import { humanize } from '../../dashboard/dashboard.models';
import { MAINTAINER_ROLES, MAINTENANCE_TYPES, WORK_ORDER_STATUSES, WorkOrder } from '../maintenance.models';

@Component({
  selector: 'app-maintenance-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatPaginatorModule, MatFormFieldModule, MatInputModule, MatSelectModule
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Maintenance</h1>
        <p>Work orders for services, repairs and inspections.</p>
      </div>
      @if (canCreate) {
        <div class="head-actions">
          <a mat-flat-button color="primary" routerLink="new"><mat-icon>add</mat-icon> New work order</a>
        </div>
      }
    </div>

    <form class="filters" [formGroup]="filters">
      <mat-form-field appearance="outline" class="grow">
        <mat-label>Search</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput formControlName="search" placeholder="WO number, registration, description, workshop">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Status</mat-label>
        <mat-select formControlName="status">
          <mat-option [value]="null">All statuses</mat-option>
          @for (s of statuses; track s) { <mat-option [value]="s">{{ humanize(s) }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Type</mat-label>
        <mat-select formControlName="type">
          <mat-option [value]="null">All types</mat-option>
          @for (t of types; track t) { <mat-option [value]="t">{{ humanize(t) }}</mat-option> }
        </mat-select>
      </mat-form-field>
    </form>

    <div class="table-wrap">
      <table mat-table [dataSource]="orders()">
        <ng-container matColumnDef="number">
          <th mat-header-cell *matHeaderCellDef>Work order</th>
          <td mat-cell *matCellDef="let w"><strong>{{ w.workOrderNumber }}</strong></td>
        </ng-container>
        <ng-container matColumnDef="vehicle">
          <th mat-header-cell *matHeaderCellDef>Vehicle</th>
          <td mat-cell *matCellDef="let w">
            {{ w.vehicleRegistration }}
            <div class="muted">{{ w.vehicleMake }} {{ w.vehicleModel }}</div>
          </td>
        </ng-container>
        <ng-container matColumnDef="type">
          <th mat-header-cell *matHeaderCellDef>Type</th>
          <td mat-cell *matCellDef="let w">
            {{ humanize(w.type) }}
            @if (w.serviceType) { <div class="muted">{{ w.serviceType }}</div> }
          </td>
        </ng-container>
        <ng-container matColumnDef="description">
          <th mat-header-cell *matHeaderCellDef>Description</th>
          <td mat-cell *matCellDef="let w" class="desc">{{ w.description }}</td>
        </ng-container>
        <ng-container matColumnDef="scheduled">
          <th mat-header-cell *matHeaderCellDef>Scheduled</th>
          <td mat-cell *matCellDef="let w">{{ (w.scheduledDate | date:'d MMM y') || '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let w"><span class="pill" [attr.data-status]="w.status">{{ humanize(w.status) }}</span></td>
        </ng-container>
        <ng-container matColumnDef="cost">
          <th mat-header-cell *matHeaderCellDef>Total cost</th>
          <td mat-cell *matCellDef="let w">{{ w.totalCost != null ? ('R' + (w.totalCost | number:'1.2-2')) : '—' }}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns;" class="clickable" (click)="open(row)"></tr>
      </table>
      @if (!loading() && orders().length === 0) {
        <div class="empty"><mat-icon>build</mat-icon>No work orders match these filters.</div>
      }
      <mat-paginator [length]="total()" [pageIndex]="pageIndex" [pageSize]="pageSize"
                     [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>
    </div>
  `,
  styles: [`
    .muted { color: var(--fo-muted); font-size: 0.78rem; }
    .desc { max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  `]
})
export class MaintenanceListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);

  readonly canCreate = this.auth.hasAnyRole(MAINTAINER_ROLES);
  readonly statuses = WORK_ORDER_STATUSES;
  readonly types = MAINTENANCE_TYPES;
  readonly humanize = humanize;
  readonly columns = ['number', 'vehicle', 'type', 'description', 'scheduled', 'status', 'cost'];

  readonly orders = signal<WorkOrder[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  readonly filters = new FormGroup({
    search: new FormControl(''),
    status: new FormControl<string | null>(null),
    type: new FormControl<string | null>(null)
  });

  pageIndex = 0;
  pageSize = 20;

  ngOnInit() {
    const c = this.filters.controls;
    merge(c.search.valueChanges.pipe(debounceTime(300)), c.status.valueChanges, c.type.valueChanges)
      .subscribe(() => { this.pageIndex = 0; this.load(); });
    this.load();
  }

  load() {
    const { search, status, type } = this.filters.value;
    let params = new HttpParams()
      .set('page', this.pageIndex).set('size', this.pageSize).set('sort', 'createdAt,desc');
    if (search?.trim()) params = params.set('search', search.trim());
    if (status) params = params.set('status', status);
    if (type) params = params.set('type', type);
    this.loading.set(true);
    this.http.get<Page<WorkOrder>>('/api/v1/maintenance', { params }).subscribe({
      next: r => {
        this.orders.set(r.content ?? []);
        this.total.set(r.totalElements ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onPage(e: PageEvent) {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.load();
  }

  open(w: WorkOrder) {
    this.router.navigate(['/maintenance', w.id]);
  }
}
