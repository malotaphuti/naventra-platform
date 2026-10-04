import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Page } from '../../../core/models/page.model';
import { NotifyService } from '../../../core/services/notify.service';
import { DialogService } from '../../../shared/dialogs/dialog.service';
import { TripSummary, daysUntil, expiryTone, humanize } from '../../dashboard/dashboard.models';
import { Vehicle } from '../../vehicles/vehicle.models';
import { Driver, SETTABLE_DRIVER_STATUSES } from '../driver.models';

@Component({
  selector: 'app-driver-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatButtonModule, MatIconModule, MatMenuModule,
    MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule
  ],
  template: `
    <a class="back-link" routerLink="/drivers"><mat-icon>arrow_back</mat-icon> Back to drivers</a>

    @if (loading() && !driver()) {
      <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (driver()) { @if (driver(); as d) {
      <div class="page-head">
        <div>
          <h1>{{ d.fullName }} <span class="pill" [attr.data-status]="d.status">{{ label(d.status) }}</span></h1>
          <p>Employee {{ d.employeeNumber }} · {{ d.email }}</p>
        </div>
        <div class="detail-actions">
          <a mat-stroked-button [routerLink]="['/drivers', d.id, 'edit']"><mat-icon>edit</mat-icon> Edit</a>
          <button mat-stroked-button [matMenuTriggerFor]="statusMenu" [disabled]="d.status === 'ON_TRIP' || busy()">
            <mat-icon>swap_horiz</mat-icon> Change status
          </button>
          <mat-menu #statusMenu="matMenu">
            @for (s of statuses; track s) {
              <button mat-menu-item [disabled]="s === d.status" (click)="changeStatus(s)">{{ label(s) }}</button>
            }
          </mat-menu>
          <button mat-stroked-button color="warn" (click)="remove()" [disabled]="d.status === 'ON_TRIP' || busy()">
            <mat-icon>delete</mat-icon> Delete
          </button>
        </div>
      </div>

      <div class="panel-grid">
        <section class="panel span-7">
          <div class="panel-head"><h2>Licence &amp; contact</h2></div>
          <div class="facts">
            <div class="fact"><span class="fact-label">Licence number</span><span class="fact-value">{{ d.licenseNumber }}</span></div>
            <div class="fact"><span class="fact-label">Licence class</span><span class="fact-value">{{ d.licenseClass || '—' }}</span></div>
            <div class="fact">
              <span class="fact-label">Licence expiry</span>
              <span class="fact-value"><span class="pill" [ngClass]="tone(d.licenseExpiryDate)">{{ d.licenseExpiryDate | date:'d MMM y' }} · {{ remaining(d.licenseExpiryDate) }}</span></span>
            </div>
            <div class="fact">
              <span class="fact-label">Medical certificate</span>
              <span class="fact-value">
                @if (d.medicalCertificateExpiry) {
                  <span class="pill" [ngClass]="tone(d.medicalCertificateExpiry)">{{ d.medicalCertificateExpiry | date:'d MMM y' }} · {{ remaining(d.medicalCertificateExpiry) }}</span>
                } @else { Not on file }
              </span>
            </div>
            <div class="fact"><span class="fact-label">Contact number</span><span class="fact-value">{{ d.contactNumber || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Email</span><span class="fact-value">{{ d.email }}</span></div>
            <div class="fact"><span class="fact-label">Emergency contact</span><span class="fact-value">{{ d.emergencyContactName || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Emergency number</span><span class="fact-value">{{ d.emergencyContactNumber || '—' }}</span></div>
          </div>
        </section>

        <section class="panel span-5">
          <div class="panel-head">
            <h2>Assigned vehicle</h2>
            @if (d.assignedVehicleId) { <a [routerLink]="['/vehicles', d.assignedVehicleId]">View vehicle</a> }
          </div>
          @if (editingVehicle()) {
            <mat-form-field appearance="outline" class="full">
              <mat-label>Vehicle</mat-label>
              <mat-select [(ngModel)]="selectedVehicleId">
                @for (v of assignable(); track v.id) {
                  <mat-option [value]="v.id">{{ v.registrationNumber }} · {{ v.make }} {{ v.model }} ({{ label(v.status) }})</mat-option>
                }
              </mat-select>
              @if (!assignable().length) { <mat-hint>No unassigned vehicles available</mat-hint> }
            </mat-form-field>
            <div class="detail-actions">
              <button mat-flat-button color="primary" (click)="assign()" [disabled]="!selectedVehicleId || busy()">Assign</button>
              <button mat-stroked-button (click)="editingVehicle.set(false)">Cancel</button>
            </div>
          } @else if (d.assignedVehicleId) {
            <div class="list">
              <div class="list-row">
                <span class="row-icon"><mat-icon>directions_car</mat-icon></span>
                <div class="row-main">
                  <div class="row-title">{{ d.assignedVehicleRegistration }}</div>
                  <div class="row-sub">Assigned vehicle</div>
                </div>
              </div>
            </div>
            <div class="detail-actions">
              <button mat-stroked-button (click)="startAssign()" [disabled]="busy()"><mat-icon>sync_alt</mat-icon> Change</button>
              <button mat-stroked-button color="warn" (click)="unassign()" [disabled]="busy()"><mat-icon>link_off</mat-icon> Unassign</button>
            </div>
          } @else {
            <div class="empty"><mat-icon>no_crash</mat-icon>No vehicle assigned.</div>
            <div class="detail-actions">
              <button mat-flat-button color="primary" (click)="startAssign()" [disabled]="busy() || d.status === 'TERMINATED'">
                <mat-icon>add_link</mat-icon> Assign vehicle
              </button>
            </div>
          }
        </section>

        <section class="panel span-12">
          <div class="panel-head">
            <h2>Recent trips</h2>
            <a routerLink="/trips">All trips</a>
          </div>
          @if (trips().length) {
            <div class="list">
              @for (t of trips(); track t.id) {
                <a class="list-row" [routerLink]="['/trips', t.id]">
                  <span class="row-icon"><mat-icon>route</mat-icon></span>
                  <div class="row-main">
                    <div class="row-title">{{ t.tripNumber }} · {{ t.origin }} → {{ t.destination }}</div>
                    <div class="row-sub">{{ t.vehicleRegistration }} · requested {{ t.requestedAt | date:'d MMM y, HH:mm' }}</div>
                  </div>
                  <span class="pill" [attr.data-status]="t.status">{{ label(t.status) }}</span>
                </a>
              }
            </div>
          } @else {
            <div class="empty"><mat-icon>route</mat-icon>No trips yet.</div>
          }
        </section>
      </div>
    } }
  `,
  styles: [`
    .page-head h1 { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .full { width: 100%; }
    .panel .detail-actions { margin-top: 1rem; }
  `]
})
export class DriverDetailComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotifyService);
  private readonly dialogs = inject(DialogService);

  private readonly id = Number(this.route.snapshot.params['id']);
  readonly driver = signal<Driver | null>(null);
  readonly trips = signal<TripSummary[]>([]);
  readonly vehicles = signal<Vehicle[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly editingVehicle = signal(false);
  readonly statuses = SETTABLE_DRIVER_STATUSES;
  readonly label = humanize;
  readonly tone = expiryTone;
  selectedVehicleId: number | null = null;

  readonly assignable = computed(() =>
    this.vehicles().filter(v => v.status !== 'RETIRED' && (v.assignedDriverId == null || v.assignedDriverId === this.id)));

  ngOnInit(): void {
    this.load();
    const params = new HttpParams().set('driverId', this.id).set('size', 5).set('sort', 'id,desc');
    this.http.get<Page<TripSummary>>('/api/v1/trips', { params }).subscribe(r => this.trips.set(r.content));
  }

  load(): void {
    this.loading.set(true);
    this.http.get<Driver>(`/api/v1/drivers/${this.id}`).subscribe({
      next: d => {
        this.driver.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  remaining(date: string | null): string {
    const days = daysUntil(date);
    if (days === null) return '';
    if (days < 0) return 'Expired';
    if (days === 0) return 'Expires today';
    return `${days} days left`;
  }

  startAssign(): void {
    this.selectedVehicleId = this.driver()?.assignedVehicleId ?? null;
    this.editingVehicle.set(true);
    const params = new HttpParams().set('size', 200).set('sort', 'registrationNumber,asc');
    this.http.get<Page<Vehicle>>('/api/v1/vehicles', { params }).subscribe(r => this.vehicles.set(r.content));
  }

  assign(): void {
    if (!this.selectedVehicleId) return;
    this.busy.set(true);
    const params = new HttpParams().set('vehicleId', this.selectedVehicleId);
    this.http.put<Driver>(`/api/v1/drivers/${this.id}/vehicle`, null, { params }).subscribe({
      next: d => {
        this.driver.set(d);
        this.editingVehicle.set(false);
        this.busy.set(false);
        this.notify.success(`Vehicle ${d.assignedVehicleRegistration} assigned`);
      },
      error: () => this.busy.set(false)
    });
  }

  unassign(): void {
    const d = this.driver();
    if (!d) return;
    this.dialogs.confirm({
      title: 'Unassign vehicle',
      message: `Remove ${d.assignedVehicleRegistration} from ${d.fullName}?`,
      confirmText: 'Unassign'
    }).subscribe(ok => {
      if (!ok) return;
      this.busy.set(true);
      this.http.delete<Driver>(`/api/v1/drivers/${this.id}/vehicle`).subscribe({
        next: updated => {
          this.driver.set(updated);
          this.busy.set(false);
          this.notify.success('Vehicle unassigned');
        },
        error: () => this.busy.set(false)
      });
    });
  }

  changeStatus(status: string): void {
    const d = this.driver();
    if (!d) return;
    const warning = status === 'TERMINATED' ? ' Their vehicle assignment will be removed.' : '';
    this.dialogs.confirm({
      title: 'Change driver status',
      message: `Set ${d.fullName} to "${humanize(status)}"?${warning}`,
      confirmText: 'Change status',
      danger: status === 'TERMINATED' || status === 'SUSPENDED'
    }).subscribe(ok => {
      if (!ok) return;
      this.busy.set(true);
      const params = new HttpParams().set('status', status);
      this.http.patch<Driver>(`/api/v1/drivers/${this.id}/status`, null, { params }).subscribe({
        next: updated => {
          this.driver.set(updated);
          this.busy.set(false);
          this.notify.success(`Status changed to ${humanize(status)}`);
        },
        error: () => this.busy.set(false)
      });
    });
  }

  remove(): void {
    const d = this.driver();
    if (!d) return;
    this.dialogs.confirm({
      title: 'Delete driver',
      message: `Delete ${d.fullName} (${d.employeeNumber})? Their vehicle assignment is released. Their login account is not deleted.`,
      confirmText: 'Delete',
      danger: true
    }).subscribe(ok => {
      if (!ok) return;
      this.busy.set(true);
      this.http.delete(`/api/v1/drivers/${this.id}`).subscribe({
        next: () => {
          this.notify.success('Driver deleted');
          this.router.navigate(['/drivers']);
        },
        error: () => this.busy.set(false)
      });
    });
  }
}
