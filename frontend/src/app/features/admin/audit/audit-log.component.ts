import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Page, toLocalDate } from '../../../core/models/page.model';

interface AuditEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  performedByUserId: number;
  performedByUsername: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string;
  userAgent: string | null;
  performedAt: string;
}

const ENTITY_TYPES = ['Driver', 'Vehicle', 'Trip', 'Fuel', 'Maintenance', 'WorkOrder', 'Incident', 'User'];

@Component({
  selector: 'app-audit-log',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatPaginatorModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Audit log</h1>
        <p>Every successful change made through the API, newest first.</p>
      </div>
      <div class="head-actions">
        <button mat-stroked-button (click)="clear()"><mat-icon>filter_alt_off</mat-icon> Clear filters</button>
      </div>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline">
        <mat-label>User</mat-label>
        <input matInput [(ngModel)]="username" (keyup.enter)="reload()" placeholder="Username">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Entity</mat-label>
        <mat-select [(ngModel)]="entityType" (selectionChange)="reload()">
          <mat-option [value]="null">All entities</mat-option>
          @for (e of entityTypes; track e) { <mat-option [value]="e">{{ e }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Action</mat-label>
        <input matInput [(ngModel)]="action" (keyup.enter)="reload()" placeholder="e.g. APPROVE">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Date range</mat-label>
        <mat-date-range-input [rangePicker]="picker">
          <input matStartDate [(ngModel)]="from" placeholder="From">
          <input matEndDate [(ngModel)]="to" placeholder="To" (dateChange)="reload()">
        </mat-date-range-input>
        <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
        <mat-date-range-picker #picker></mat-date-range-picker>
      </mat-form-field>
      <button mat-flat-button color="primary" (click)="reload()"><mat-icon>search</mat-icon> Apply</button>
    </div>

    <div class="table-wrap">
      <table mat-table [dataSource]="entries()">
        <ng-container matColumnDef="time">
          <th mat-header-cell *matHeaderCellDef>Time</th>
          <td mat-cell *matCellDef="let e" class="nowrap">{{ e.performedAt | date:'d MMM y, HH:mm:ss' }}</td>
        </ng-container>
        <ng-container matColumnDef="user">
          <th mat-header-cell *matHeaderCellDef>User</th>
          <td mat-cell *matCellDef="let e">{{ e.performedByUsername || '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="action">
          <th mat-header-cell *matHeaderCellDef>Action</th>
          <td mat-cell *matCellDef="let e">
            <span class="pill">{{ e.action }}</span>
            @if (e.oldValue || e.newValue) {
              <div class="sub">{{ e.oldValue || '—' }} → {{ e.newValue || '—' }}</div>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="entity">
          <th mat-header-cell *matHeaderCellDef>Entity</th>
          <td mat-cell *matCellDef="let e">{{ e.entityType }}</td>
        </ng-container>
        <ng-container matColumnDef="entityId">
          <th mat-header-cell *matHeaderCellDef>Entity ID</th>
          <td mat-cell *matCellDef="let e">{{ e.entityId || '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="ip">
          <th mat-header-cell *matHeaderCellDef>IP address</th>
          <td mat-cell *matCellDef="let e" [title]="e.userAgent || ''">{{ e.ipAddress }}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
      @if (loading()) {
        <div class="loading-container"><mat-spinner diameter="36"></mat-spinner></div>
      } @else if (!entries().length) {
        <div class="empty"><mat-icon>history</mat-icon>No audit entries match your filters.</div>
      }
      <mat-paginator [length]="total()" [pageIndex]="page" [pageSize]="size" [pageSizeOptions]="[25, 50, 100]"
                     (page)="onPage($event)"></mat-paginator>
    </div>
  `,
  styles: [`
    .sub { font-size: 0.75rem; color: var(--fo-muted); margin-top: 2px; }
    .nowrap { white-space: nowrap; }
  `]
})
export class AuditLogComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly entries = signal<AuditEntry[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly columns = ['time', 'user', 'action', 'entity', 'entityId', 'ip'];
  readonly entityTypes = ENTITY_TYPES;

  username = '';
  entityType: string | null = null;
  action = '';
  from: Date | null = null;
  to: Date | null = null;
  page = 0;
  size = 50;

  ngOnInit(): void { this.load(); }

  reload(): void {
    this.page = 0;
    this.load();
  }

  clear(): void {
    this.username = '';
    this.entityType = null;
    this.action = '';
    this.from = null;
    this.to = null;
    this.reload();
  }

  load(): void {
    let params = new HttpParams().set('page', this.page).set('size', this.size);
    if (this.username.trim()) params = params.set('username', this.username.trim());
    if (this.entityType) params = params.set('entityType', this.entityType);
    if (this.action.trim()) params = params.set('action', this.action.trim());
    if (this.from) params = params.set('from', toLocalDate(this.from));
    if (this.to) params = params.set('to', toLocalDate(this.to));
    this.loading.set(true);
    this.http.get<Page<AuditEntry>>('/api/v1/admin/audit-logs', { params }).subscribe({
      next: r => {
        this.entries.set(r.content);
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
}
