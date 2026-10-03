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
import {
  INCIDENT_REPORTER_ROLES, INCIDENT_SEVERITIES, INCIDENT_STATUSES, Incident, severityTone
} from '../incident.models';

@Component({
  selector: 'app-incident-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatPaginatorModule, MatFormFieldModule, MatInputModule, MatSelectModule
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>{{ isDriver ? 'My incidents' : 'Incidents' }}</h1>
        <p>{{ isDriver ? 'Incidents you have reported.' : 'Accidents, breakdowns and other incidents across the fleet.' }}</p>
      </div>
      @if (canReport) {
        <div class="head-actions">
          <a mat-flat-button color="primary" routerLink="new"><mat-icon>report</mat-icon> Report incident</a>
        </div>
      }
    </div>

    <form class="filters" [formGroup]="filters">
      <mat-form-field appearance="outline" class="grow">
        <mat-label>Search</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput formControlName="search" placeholder="INC number, registration, description, location">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Status</mat-label>
        <mat-select formControlName="status">
          <mat-option [value]="null">All statuses</mat-option>
          @for (s of statuses; track s) { <mat-option [value]="s">{{ humanize(s) }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Severity</mat-label>
        <mat-select formControlName="severity">
          <mat-option [value]="null">All severities</mat-option>
          @for (s of severities; track s) { <mat-option [value]="s">{{ humanize(s) }}</mat-option> }
        </mat-select>
      </mat-form-field>
    </form>

    <div class="table-wrap">
      <table mat-table [dataSource]="incidents()">
        <ng-container matColumnDef="number">
          <th mat-header-cell *matHeaderCellDef>Incident</th>
          <td mat-cell *matCellDef="let i"><strong>{{ i.incidentNumber }}</strong></td>
        </ng-container>
        <ng-container matColumnDef="occurred">
          <th mat-header-cell *matHeaderCellDef>Occurred</th>
          <td mat-cell *matCellDef="let i">{{ (i.occurredAt | date:'d MMM y, HH:mm') || '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="vehicle">
          <th mat-header-cell *matHeaderCellDef>Vehicle</th>
          <td mat-cell *matCellDef="let i">{{ i.vehicleRegistration }}</td>
        </ng-container>
        <ng-container matColumnDef="driver">
          <th mat-header-cell *matHeaderCellDef>Driver</th>
          <td mat-cell *matCellDef="let i">{{ i.driverName }}</td>
        </ng-container>
        <ng-container matColumnDef="type">
          <th mat-header-cell *matHeaderCellDef>Type</th>
          <td mat-cell *matCellDef="let i">{{ humanize(i.type) }}</td>
        </ng-container>
        <ng-container matColumnDef="severity">
          <th mat-header-cell *matHeaderCellDef>Severity</th>
          <td mat-cell *matCellDef="let i"><span class="pill" [ngClass]="tone(i.severity)">{{ humanize(i.severity) }}</span></td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let i">
            <span class="pill" [attr.data-status]="i.status" [class.warn]="i.status === 'IN_MAINTENANCE'">{{ humanize(i.status) }}</span>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns;" class="clickable" (click)="open(row)"></tr>
      </table>
      @if (!loading() && incidents().length === 0) {
        <div class="empty"><mat-icon>verified</mat-icon>No incidents match these filters.</div>
      }
      <mat-paginator [length]="total()" [pageIndex]="pageIndex" [pageSize]="pageSize"
                     [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>
    </div>
  `
})
export class IncidentListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);

  readonly isDriver = this.auth.hasRole('DRIVER');
  readonly canReport = this.auth.hasAnyRole(INCIDENT_REPORTER_ROLES);
  readonly statuses = INCIDENT_STATUSES;
  readonly severities = INCIDENT_SEVERITIES;
  readonly humanize = humanize;
  readonly tone = severityTone;
  readonly columns = ['number', 'occurred', 'vehicle', ...(this.isDriver ? [] : ['driver']), 'type', 'severity', 'status'];

  readonly incidents = signal<Incident[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  readonly filters = new FormGroup({
    search: new FormControl(''),
    status: new FormControl<string | null>(null),
    severity: new FormControl<string | null>(null)
  });

  pageIndex = 0;
  pageSize = 20;

  ngOnInit() {
    const c = this.filters.controls;
    merge(c.search.valueChanges.pipe(debounceTime(300)), c.status.valueChanges, c.severity.valueChanges)
      .subscribe(() => { this.pageIndex = 0; this.load(); });
    this.load();
  }

  load() {
    const { search, status, severity } = this.filters.value;
    let params = new HttpParams()
      .set('page', this.pageIndex).set('size', this.pageSize).set('sort', 'createdAt,desc');
    if (search?.trim()) params = params.set('search', search.trim());
    if (status) params = params.set('status', status);
    if (severity) params = params.set('severity', severity);
    this.loading.set(true);
    this.http.get<Page<Incident>>('/api/v1/incidents', { params }).subscribe({
      next: r => {
        this.incidents.set(r.content ?? []);
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

  open(i: Incident) {
    this.router.navigate(['/incidents', i.id]);
  }
}
