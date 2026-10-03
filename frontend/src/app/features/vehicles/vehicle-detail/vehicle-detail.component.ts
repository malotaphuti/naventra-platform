import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../../../core/stores/auth.store';
import { NotifyService } from '../../../core/services/notify.service';
import { DialogService } from '../../../shared/dialogs/dialog.service';
import { daysUntil, expiryTone, humanize } from '../../dashboard/dashboard.models';
import { VEHICLE_TRANSITIONS, Vehicle } from '../vehicle.models';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule],
  template: `
    <a class="back-link" routerLink="/vehicles"><mat-icon>arrow_back</mat-icon> Back to vehicles</a>

    @if (loading() && !vehicle()) {
      <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (vehicle()) { @if (vehicle(); as v) {
      <div class="page-head">
        <div class="head">
          <span class="plate">{{ v.registrationNumber }}</span>
          <div>
            <h1>{{ v.make }} {{ v.model }} <span class="pill" [attr.data-status]="v.status">{{ label(v.status) }}</span></h1>
            <p>{{ v.year }}{{ v.variant ? ' · ' + v.variant : '' }} · {{ v.color || 'Colour n/a' }} · {{ v.fuelType || 'Fuel n/a' }}</p>
          </div>
        </div>
        <div class="detail-actions">
          @if (canEdit) {
            <a mat-stroked-button [routerLink]="['/vehicles', v.id, 'edit']"><mat-icon>edit</mat-icon> Edit</a>
          }
          @if (canChangeStatus) {
            <button mat-stroked-button [matMenuTriggerFor]="statusMenu" [disabled]="!nextStatuses().length || busy()">
              <mat-icon>swap_horiz</mat-icon> Change status
            </button>
            <mat-menu #statusMenu="matMenu">
              @for (s of nextStatuses(); track s) {
                <button mat-menu-item (click)="changeStatus(s)">{{ label(s) }}</button>
              }
            </mat-menu>
          }
          @if (canEdit) {
            <button mat-stroked-button color="warn" (click)="remove()" [disabled]="busy()"><mat-icon>delete</mat-icon> Delete</button>
          }
        </div>
      </div>

      <div class="panel-grid">
        <section class="panel span-8">
          <div class="panel-head"><h2>Vehicle details</h2></div>
          <div class="facts">
            <div class="fact"><span class="fact-label">VIN</span><span class="fact-value">{{ v.vin || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Engine number</span><span class="fact-value">{{ v.engineNumber || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Chassis number</span><span class="fact-value">{{ v.chassisNumber || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Odometer</span><span class="fact-value">{{ v.currentOdometerKm | number }} km</span></div>
            <div class="fact"><span class="fact-label">Seats</span><span class="fact-value">{{ v.seatingCapacity || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Engine</span><span class="fact-value">{{ v.engineCapacityCc ? (v.engineCapacityCc | number) + ' cc' : '—' }}</span></div>
            <div class="fact"><span class="fact-label">Purchased</span><span class="fact-value">{{ (v.purchaseDate | date:'d MMM y') || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Purchase cost</span><span class="fact-value">{{ v.purchaseCost != null ? 'R' + (v.purchaseCost | number:'1.0-2') : '—' }}</span></div>
          </div>
        </section>

        <section class="panel span-4">
          <div class="panel-head">
            <h2>Assigned driver</h2>
            @if (v.assignedDriverId && canViewDrivers) { <a [routerLink]="['/drivers', v.assignedDriverId]">View driver</a> }
          </div>
          @if (v.assignedDriverId) {
            <div class="list">
              <div class="list-row">
                <span class="row-icon"><mat-icon>badge</mat-icon></span>
                <div class="row-main">
                  <div class="row-title">{{ v.assignedDriverName }}</div>
                  <div class="row-sub">Assigned driver</div>
                </div>
              </div>
            </div>
          } @else {
            <div class="empty"><mat-icon>person_off</mat-icon>No driver assigned.{{ canViewDrivers ? ' Assign one from the driver page.' : '' }}</div>
          }
        </section>

        <section class="panel span-12">
          <div class="panel-head"><h2>Compliance &amp; service</h2></div>
          <div class="facts">
            <div class="fact">
              <span class="fact-label">Licence disc</span>
              <span class="fact-value">
                @if (v.licenseExpiryDate) {
                  <span class="pill" [ngClass]="tone(v.licenseExpiryDate)">{{ v.licenseExpiryDate | date:'d MMM y' }} · {{ remaining(v.licenseExpiryDate) }}</span>
                } @else { Not set }
              </span>
            </div>
            <div class="fact">
              <span class="fact-label">Insurance</span>
              <span class="fact-value">
                @if (v.insuranceExpiryDate) {
                  <span class="pill" [ngClass]="tone(v.insuranceExpiryDate)">{{ v.insuranceExpiryDate | date:'d MMM y' }} · {{ remaining(v.insuranceExpiryDate) }}</span>
                } @else { Not set }
              </span>
            </div>
            <div class="fact"><span class="fact-label">Insurer</span><span class="fact-value">{{ v.insuranceProvider || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Policy number</span><span class="fact-value">{{ v.insurancePolicyNumber || '—' }}</span></div>
            <div class="fact">
              <span class="fact-label">Next service</span>
              <span class="fact-value">
                @if (v.nextServiceDate) {
                  <span class="pill" [ngClass]="tone(v.nextServiceDate)">{{ v.nextServiceDate | date:'d MMM y' }} · {{ remaining(v.nextServiceDate) }}</span>
                } @else { Not set }
              </span>
            </div>
            <div class="fact"><span class="fact-label">Next service at</span><span class="fact-value">{{ v.nextServiceMileageKm ? (v.nextServiceMileageKm | number) + ' km' : '—' }}</span></div>
          </div>
        </section>
      </div>
    } }
  `,
  styles: [`
    .head { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .head h1 { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .plate {
      padding: 0.45rem 0.9rem; border-radius: 8px; font-weight: 800; letter-spacing: 0.08em; font-size: 1.1rem;
      font-family: 'Segoe UI', Roboto, monospace; background: #fde047; color: #111827;
      border: 2px solid #111827; box-shadow: inset 0 0 0 2px #fde047;
    }
  `]
})
export class VehicleDetailComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);
  private readonly notify = inject(NotifyService);
  private readonly dialogs = inject(DialogService);

  private readonly id = Number(this.route.snapshot.params['id']);
  readonly vehicle = signal<Vehicle | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly canEdit = this.authStore.hasAnyRole(['SYSTEM_ADMIN', 'FLEET_MANAGER']);
  readonly canChangeStatus = this.authStore.hasAnyRole(['SYSTEM_ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_OFFICER']);
  readonly canViewDrivers = this.canEdit;
  readonly label = humanize;
  readonly tone = expiryTone;

  readonly nextStatuses = computed(() => VEHICLE_TRANSITIONS[this.vehicle()?.status ?? ''] ?? []);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<Vehicle>(`/api/v1/vehicles/${this.id}`).subscribe({
      next: v => {
        this.vehicle.set(v);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  remaining(date: string | null): string {
    const days = daysUntil(date);
    if (days === null) return '';
    if (days < 0) return `${-days} days overdue`;
    if (days === 0) return 'today';
    return `in ${days} days`;
  }

  changeStatus(status: string): void {
    const v = this.vehicle();
    if (!v) return;
    this.dialogs.prompt({
      title: `Mark as ${humanize(status)}`,
      message: `Change ${v.registrationNumber} from "${humanize(v.status)}" to "${humanize(status)}".`,
      label: 'Reason (optional)',
      type: 'textarea',
      value: '',
      confirmText: 'Change status',
      danger: status === 'RETIRED' || status === 'OUT_OF_SERVICE'
    }).subscribe(reason => {
      if (reason === null || reason === undefined) return;
      this.busy.set(true);
      let params = new HttpParams().set('status', status);
      if (String(reason).trim()) params = params.set('reason', String(reason).trim());
      this.http.patch(`/api/v1/vehicles/${this.id}/status`, null, { params }).subscribe({
        next: () => {
          this.busy.set(false);
          this.notify.success(`${v.registrationNumber} is now ${humanize(status)}`);
          this.load();
        },
        error: () => this.busy.set(false)
      });
    });
  }

  remove(): void {
    const v = this.vehicle();
    if (!v) return;
    this.dialogs.confirm({
      title: 'Delete vehicle',
      message: `Delete ${v.registrationNumber} (${v.make} ${v.model})? It will be removed from the fleet register.`,
      confirmText: 'Delete',
      danger: true
    }).subscribe(ok => {
      if (!ok) return;
      this.busy.set(true);
      this.http.delete(`/api/v1/vehicles/${this.id}`).subscribe({
        next: () => {
          this.notify.success('Vehicle deleted');
          this.router.navigate(['/vehicles']);
        },
        error: () => this.busy.set(false)
      });
    });
  }
}
