import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNativeDateAdapter } from '@angular/material/core';
import { debounceTime, filter, merge, switchMap } from 'rxjs';
import { Page, toLocalDate } from '../../../core/models/page.model';
import { AuthStore } from '../../../core/stores/auth.store';
import { NotifyService } from '../../../core/services/notify.service';
import { DialogService } from '../../../shared/dialogs/dialog.service';
import { VehicleOption, loadVehicles } from '../fleet-lookups';

export interface FuelEntry {
  id: number;
  vehicleId: number;
  vehicleRegistration: string;
  driverId: number;
  driverName: string;
  tripId: number | null;
  tripNumber: string | null;
  filledAt: string;
  fuelType: string;
  litres: number;
  costPerLitre: number;
  totalCost: number;
  odometerReadingKm: number;
  station: string | null;
  notes: string | null;
}

interface FuelSummary {
  entries: number;
  totalLitres: number;
  totalCost: number;
  avgCostPerLitre: number | null;
}

@Component({
  selector: 'app-fuel-list',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatPaginatorModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    MatMenuModule, MatTooltipModule
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>{{ isDriver ? 'My fuel log' : 'Fuel' }}</h1>
        <p>{{ isDriver ? 'Fuel you have logged for your vehicle.' : 'Fuel purchases across the fleet.' }}</p>
      </div>
      @if (canLog) {
        <div class="head-actions">
          <a mat-flat-button color="primary" routerLink="new"><mat-icon>local_gas_station</mat-icon> Log fuel</a>
        </div>
      }
    </div>

    <div class="stat-grid">
      <div class="stat teal">
        <span class="stat-icon"><mat-icon>water_drop</mat-icon></span>
        <div class="stat-body">
          <span class="stat-value">{{ (summary()?.totalLitres ?? 0) | number:'1.0-1' }} L</span>
          <span class="stat-label">Total litres</span>
        </div>
      </div>
      <div class="stat red">
        <span class="stat-icon"><mat-icon>payments</mat-icon></span>
        <div class="stat-body">
          <span class="stat-value">R{{ (summary()?.totalCost ?? 0) | number:'1.2-2' }}</span>
          <span class="stat-label">Total cost</span>
        </div>
      </div>
      <div class="stat amber">
        <span class="stat-icon"><mat-icon>price_change</mat-icon></span>
        <div class="stat-body">
          <span class="stat-value">{{ summary()?.avgCostPerLitre != null ? ('R' + (summary()!.avgCostPerLitre | number:'1.2-2')) : '—' }}</span>
          <span class="stat-label">Average per litre</span>
        </div>
      </div>
      <div class="stat blue">
        <span class="stat-icon"><mat-icon>receipt_long</mat-icon></span>
        <div class="stat-body">
          <span class="stat-value">{{ summary()?.entries ?? 0 }}</span>
          <span class="stat-label">Entries</span>
          <span class="stat-sub">{{ periodLabel() }}</span>
        </div>
      </div>
    </div>

    <form class="filters" [formGroup]="filters">
      <mat-form-field appearance="outline" class="grow">
        <mat-label>Search</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput formControlName="search" placeholder="Registration, station, fuel type">
      </mat-form-field>
      @if (!isDriver) {
        <mat-form-field appearance="outline">
          <mat-label>Vehicle</mat-label>
          <mat-select formControlName="vehicleId">
            <mat-option [value]="null">All vehicles</mat-option>
            @for (v of vehicles(); track v.id) {
              <mat-option [value]="v.id">{{ v.registrationNumber }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
      <mat-form-field appearance="outline">
        <mat-label>Date range</mat-label>
        <mat-date-range-input [rangePicker]="picker">
          <input matStartDate formControlName="from" placeholder="From">
          <input matEndDate formControlName="to" placeholder="To">
        </mat-date-range-input>
        <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
        <mat-date-range-picker #picker></mat-date-range-picker>
      </mat-form-field>
      @if (hasFilters()) {
        <button mat-stroked-button type="button" (click)="clearFilters()">Clear</button>
      }
    </form>

    <div class="table-wrap">
      <table mat-table [dataSource]="entries()">
        <ng-container matColumnDef="filledAt">
          <th mat-header-cell *matHeaderCellDef>Date</th>
          <td mat-cell *matCellDef="let e">{{ e.filledAt | date:'d MMM y, HH:mm' }}</td>
        </ng-container>
        <ng-container matColumnDef="vehicle">
          <th mat-header-cell *matHeaderCellDef>Vehicle</th>
          <td mat-cell *matCellDef="let e"><strong>{{ e.vehicleRegistration }}</strong></td>
        </ng-container>
        <ng-container matColumnDef="driver">
          <th mat-header-cell *matHeaderCellDef>Driver</th>
          <td mat-cell *matCellDef="let e">{{ e.driverName }}</td>
        </ng-container>
        <ng-container matColumnDef="litres">
          <th mat-header-cell *matHeaderCellDef>Litres</th>
          <td mat-cell *matCellDef="let e">{{ e.litres | number:'1.1-2' }} L <span class="muted">{{ e.fuelType }}</span></td>
        </ng-container>
        <ng-container matColumnDef="costPerLitre">
          <th mat-header-cell *matHeaderCellDef>R/L</th>
          <td mat-cell *matCellDef="let e">R{{ e.costPerLitre | number:'1.2-2' }}</td>
        </ng-container>
        <ng-container matColumnDef="totalCost">
          <th mat-header-cell *matHeaderCellDef>Total</th>
          <td mat-cell *matCellDef="let e"><strong>R{{ e.totalCost | number:'1.2-2' }}</strong></td>
        </ng-container>
        <ng-container matColumnDef="odometer">
          <th mat-header-cell *matHeaderCellDef>Odometer</th>
          <td mat-cell *matCellDef="let e">{{ e.odometerReadingKm | number }} km</td>
        </ng-container>
        <ng-container matColumnDef="station">
          <th mat-header-cell *matHeaderCellDef>Station</th>
          <td mat-cell *matCellDef="let e">
            {{ e.station || '—' }}
            @if (e.tripNumber) { <div class="muted">{{ e.tripNumber }}</div> }
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let e">
            <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Actions"><mat-icon>more_vert</mat-icon></button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="remove(e)"><mat-icon>delete</mat-icon> Delete entry</button>
            </mat-menu>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns;" [matTooltip]="row.notes || ''"></tr>
      </table>
      @if (!loading() && entries().length === 0) {
        <div class="empty"><mat-icon>local_gas_station</mat-icon>No fuel entries match these filters.</div>
      }
      <mat-paginator [length]="total()" [pageIndex]="pageIndex" [pageSize]="pageSize"
                     [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>
    </div>
  `,
  styles: [`.muted { color: var(--fo-muted); font-size: 0.78rem; }`]
})
export class FuelListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthStore);
  private readonly notify = inject(NotifyService);
  private readonly dialogs = inject(DialogService);

  readonly isDriver = this.auth.hasRole('DRIVER');
  readonly canLog = this.auth.hasAnyRole(['DRIVER', 'FLEET_MANAGER', 'SYSTEM_ADMIN']);
  readonly canDelete = this.auth.hasAnyRole(['FLEET_MANAGER', 'SYSTEM_ADMIN']);

  readonly entries = signal<FuelEntry[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly summary = signal<FuelSummary | null>(null);
  readonly vehicles = signal<VehicleOption[]>([]);

  readonly columns = [
    'filledAt', 'vehicle', ...(this.isDriver ? [] : ['driver']),
    'litres', 'costPerLitre', 'totalCost', 'odometer', 'station',
    ...(this.canDelete ? ['actions'] : [])
  ];

  readonly filters = new FormGroup({
    search: new FormControl(''),
    vehicleId: new FormControl<number | null>(null),
    from: new FormControl<Date | null>(null),
    to: new FormControl<Date | null>(null)
  });

  pageIndex = 0;
  pageSize = 20;

  ngOnInit() {
    if (!this.isDriver) {
      loadVehicles(this.http).subscribe(v => this.vehicles.set(v));
    }
    const c = this.filters.controls;
    merge(
      c.search.valueChanges.pipe(debounceTime(300)),
      c.vehicleId.valueChanges,
      // Only react once the range is complete (or cleared), not on the first click of the picker.
      c.to.valueChanges.pipe(filter(() => !!c.to.value === !!c.from.value)),
      c.from.valueChanges.pipe(filter(v => v === null && c.to.value === null))
    ).subscribe(() => { this.pageIndex = 0; this.load(); });
    this.load();
  }

  hasFilters(): boolean {
    const v = this.filters.value;
    return !!(v.search || v.vehicleId || v.from || v.to);
  }

  clearFilters() {
    this.filters.reset({ search: '', vehicleId: null, from: null, to: null }, { emitEvent: false });
    this.pageIndex = 0;
    this.load();
  }

  periodLabel(): string {
    const { from, to } = this.filters.value;
    if (from && to) return `${from.toLocaleDateString()} – ${to.toLocaleDateString()}`;
    return 'All time';
  }

  load() {
    let params = this.filterParams();
    this.http.get<FuelSummary>('/api/v1/fuel/summary', { params }).subscribe({
      next: s => this.summary.set(s),
      error: () => this.summary.set(null)
    });

    params = params.set('page', this.pageIndex).set('size', this.pageSize).set('sort', 'filledAt,desc');
    const search = this.filters.value.search?.trim();
    if (search) params = params.set('search', search);
    this.loading.set(true);
    this.http.get<Page<FuelEntry>>('/api/v1/fuel', { params }).subscribe({
      next: r => {
        this.entries.set(r.content ?? []);
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

  remove(e: FuelEntry) {
    this.dialogs.confirm({
      title: 'Delete fuel entry?',
      message: `${e.litres} L for ${e.vehicleRegistration} on ${new Date(e.filledAt).toLocaleString()} (R${e.totalCost}) will be removed from reports.`,
      confirmText: 'Delete',
      danger: true
    }).pipe(
      filter(ok => !!ok),
      switchMap(() => this.http.delete(`/api/v1/fuel/${e.id}`))
    ).subscribe({
      next: () => { this.notify.success('Fuel entry deleted'); this.load(); },
      error: () => {}
    });
  }

  private filterParams(): HttpParams {
    const { vehicleId, from, to } = this.filters.value;
    let params = new HttpParams();
    if (vehicleId) params = params.set('vehicleId', vehicleId);
    if (from) params = params.set('from', toLocalDate(from));
    if (to) params = params.set('to', toLocalDate(to));
    return params;
  }
}
