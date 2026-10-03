import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { SILENT_ERRORS } from '../../../core/interceptors/auth.interceptor';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, filter } from 'rxjs';
import { AuthStore } from '../../../core/stores/auth.store';
import { NotifyService } from '../../../core/services/notify.service';
import { DialogService } from '../../../shared/dialogs/dialog.service';
import { humanize } from '../../dashboard/dashboard.models';
import { TRIP_MANAGER_ROLES, Trip } from '../trip.models';

interface Step { label: string; at: string | null; state: 'done' | 'current' | 'todo' | 'stopped'; note?: string | null; }

@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <a class="back-link" [routerLink]="base"><mat-icon>arrow_back</mat-icon> Back to {{ isDriver ? 'my trips' : 'trips' }}</a>

    @if (loading() && !trip()) {
      <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (!trip()) {
      <div class="panel"><div class="empty"><mat-icon>route</mat-icon>Trip not found.</div></div>
    }
    @if (trip(); as t) {
      <div class="page-head">
        <div>
          <h1>{{ t.tripNumber }} <span class="pill" [attr.data-status]="t.status">{{ label(t.status) }}</span></h1>
          <p class="route"><mat-icon>trip_origin</mat-icon>{{ t.origin }}<mat-icon>arrow_forward</mat-icon><mat-icon>place</mat-icon>{{ t.destination }}</p>
        </div>
      </div>

      @if (hasActions()) {
        <div class="detail-actions">
          @if (t.status === 'REQUESTED' && isManager) {
            <button mat-flat-button color="primary" [disabled]="busy()" (click)="approve()"><mat-icon>check</mat-icon> Approve</button>
            <button mat-stroked-button color="warn" [disabled]="busy()" (click)="reject()"><mat-icon>block</mat-icon> Reject</button>
          }
          @if (t.status === 'APPROVED' && canDrive) {
            <button mat-flat-button color="primary" [disabled]="busy()" (click)="start()"><mat-icon>play_arrow</mat-icon> Start trip</button>
          }
          @if (t.status === 'IN_PROGRESS' && canDrive) {
            <button mat-flat-button color="primary" [disabled]="busy()" (click)="end()"><mat-icon>flag</mat-icon> End trip</button>
          }
          @if (t.status === 'COMPLETED' && isManager) {
            <button mat-flat-button color="primary" [disabled]="busy()" (click)="close()"><mat-icon>task_alt</mat-icon> Close trip</button>
          }
          @if (cancellable(t) && canDrive) {
            <button mat-stroked-button [disabled]="busy()" (click)="cancel()"><mat-icon>cancel</mat-icon> Cancel trip</button>
          }
        </div>
      }

      <div class="panel-grid">
        <section class="panel span-8">
          <div class="panel-head"><h2>Trip details</h2></div>
          <div class="facts">
            <div class="fact"><span class="fact-label">Vehicle</span>
              <span class="fact-value">{{ t.vehicleRegistration }}{{ t.vehicleMake ? ' · ' + t.vehicleMake + ' ' + (t.vehicleModel || '') : '' }}</span></div>
            <div class="fact"><span class="fact-label">Driver</span><span class="fact-value">{{ t.driverName || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Purpose</span><span class="fact-value">{{ t.purpose || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Passengers</span><span class="fact-value">{{ t.passengers ?? '—' }}</span></div>
            <div class="fact"><span class="fact-label">Cargo</span><span class="fact-value">{{ t.cargo || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Approved by</span><span class="fact-value">{{ t.approvedByName || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Start mileage</span><span class="fact-value">{{ km(t.startMileageKm) }}</span></div>
            <div class="fact"><span class="fact-label">End mileage</span><span class="fact-value">{{ km(t.endMileageKm) }}</span></div>
            <div class="fact"><span class="fact-label">Distance</span><span class="fact-value">{{ km(t.distanceKm) }}</span></div>
            @if (t.rejectionReason) {
              <div class="fact"><span class="fact-label">Rejection reason</span><span class="fact-value">{{ t.rejectionReason }}</span></div>
            }
            @if (t.status === 'CANCELLED') {
              <div class="fact"><span class="fact-label">Cancel reason</span><span class="fact-value">{{ t.reviewNotes || 'No reason given' }}</span></div>
            }
          </div>
        </section>

        <section class="panel span-4">
          <div class="panel-head"><h2>Timeline</h2></div>
          <ol class="timeline">
            @for (s of steps(); track s.label) {
              <li [attr.data-state]="s.state">
                <span class="dot"></span>
                <div>
                  <strong>{{ s.label }}</strong>
                  <small>{{ s.at ? (s.at | date:'d MMM y, HH:mm') : (s.state === 'current' ? 'Now' : 'Pending') }}</small>
                  @if (s.note) { <small>{{ s.note }}</small> }
                </div>
              </li>
            }
          </ol>
        </section>
      </div>
    }
  `,
  styles: [`
    h1 { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .route { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .route mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--fo-muted); }
    .timeline { list-style: none; margin: 0; padding: 0; }
    .timeline li { display: flex; gap: 12px; position: relative; padding-bottom: 18px; }
    .timeline li:not(:last-child)::before {
      content: ''; position: absolute; left: 6px; top: 16px; bottom: 0; width: 2px; background: var(--fo-border);
    }
    .timeline .dot {
      flex: none; width: 14px; height: 14px; margin-top: 3px; border-radius: 50%;
      border: 2px solid var(--fo-border); background: var(--fo-surface);
    }
    .timeline li[data-state=done] .dot { background: var(--fo-accent-strong); border-color: var(--fo-accent-strong); }
    .timeline li[data-state=current] .dot { border-color: var(--fo-blue); background: var(--fo-blue); box-shadow: 0 0 0 4px rgba(37, 99, 235, .15); }
    .timeline li[data-state=stopped] .dot { background: var(--fo-red); border-color: var(--fo-red); }
    .timeline li[data-state=todo] { color: var(--fo-muted); }
    .timeline div { display: flex; flex-direction: column; }
    .timeline small { color: var(--fo-muted); }
  `]
})
export class TripDetailComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthStore);
  private readonly notify = inject(NotifyService);
  private readonly dialogs = inject(DialogService);

  readonly isDriver = this.auth.hasRole('DRIVER');
  readonly isManager = this.auth.hasAnyRole(TRIP_MANAGER_ROLES);
  /** Start, end and cancel are open to managers and to the driver (backend restricts drivers to their own trips). */
  readonly canDrive = this.isManager || this.isDriver;
  readonly base = this.isDriver ? '/my-trips' : '/trips';
  readonly label = humanize;

  readonly trip = signal<Trip | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  private readonly vehicleOdometer = signal<number | null>(null);

  readonly hasActions = computed(() => {
    const t = this.trip();
    if (!t) return false;
    return (this.isManager && ['REQUESTED', 'COMPLETED'].includes(t.status))
      || (this.canDrive && ['REQUESTED', 'APPROVED', 'ALLOCATED', 'IN_PROGRESS'].includes(t.status));
  });

  readonly steps = computed<Step[]>(() => {
    const t = this.trip();
    if (!t) return [];
    const order = ['REQUESTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'];
    const lifecycle: { label: string; at: string | null }[] = [
      { label: 'Requested', at: t.requestedAt },
      { label: 'Approved', at: t.approvedAt },
      { label: 'Started', at: t.startedAt },
      { label: 'Completed', at: t.completedAt },
      { label: 'Closed', at: t.closedAt }
    ];

    if (t.status === 'REJECTED' || t.status === 'CANCELLED') {
      const reached = lifecycle.filter(s => s.at).map(s => ({ ...s, state: 'done' as const }));
      return [...reached, {
        label: t.status === 'REJECTED' ? 'Rejected' : 'Cancelled',
        at: null,
        state: 'stopped' as const,
        note: t.status === 'REJECTED' ? t.rejectionReason : t.reviewNotes
      }];
    }

    const idx = order.indexOf(t.status === 'ALLOCATED' ? 'APPROVED' : t.status);
    return lifecycle.map((s, i) => ({
      ...s,
      state: i < idx || (i === idx && t.status === 'CLOSED') ? 'done' : i === idx ? 'current' : 'todo'
    }));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.loading.set(true);
    this.http.get<Trip>(`/api/v1/trips/${id}`).subscribe({
      next: t => {
        this.trip.set(t);
        this.loading.set(false);
        if (t.status === 'APPROVED' && this.canDrive) this.loadOdometer(t.vehicleId);
      },
      error: () => this.loading.set(false)
    });
  }

  cancellable(t: Trip): boolean {
    return ['REQUESTED', 'APPROVED', 'ALLOCATED'].includes(t.status);
  }

  km(v: number | null): string {
    return v == null ? '—' : `${v.toLocaleString()} km`;
  }

  approve(): void {
    const t = this.trip()!;
    this.dialogs.confirm({
      title: 'Approve trip',
      message: `Approve ${t.tripNumber} and reserve ${t.vehicleRegistration} for ${t.driverName || 'the driver'}?`,
      confirmText: 'Approve'
    }).pipe(filter(Boolean))
      .subscribe(() => this.act(this.http.put<Trip>(`/api/v1/trips/${t.id}/approve`, {}), 'Trip approved'));
  }

  reject(): void {
    const t = this.trip()!;
    this.dialogs.prompt({
      title: 'Reject trip', label: 'Reason', type: 'textarea', required: true, confirmText: 'Reject', danger: true
    }).pipe(filter(v => v != null && String(v).trim() !== ''))
      .subscribe(reason => {
        const params = new HttpParams().set('reason', String(reason).trim());
        this.act(this.http.put<Trip>(`/api/v1/trips/${t.id}/reject`, {}, { params }), 'Trip rejected');
      });
  }

  cancel(): void {
    const t = this.trip()!;
    this.dialogs.prompt({
      title: 'Cancel trip', message: `Cancel ${t.tripNumber}? The vehicle reservation will be released.`,
      label: 'Reason (optional)', type: 'textarea', value: '', confirmText: 'Cancel trip', danger: true
    }).pipe(filter(v => v != null))
      .subscribe(reason => {
        let params = new HttpParams();
        if (String(reason).trim()) params = params.set('reason', String(reason).trim());
        this.act(this.http.put<Trip>(`/api/v1/trips/${t.id}/cancel`, {}, { params }), 'Trip cancelled');
      });
  }

  start(): void {
    const t = this.trip()!;
    const odo = this.vehicleOdometer();
    this.dialogs.prompt({
      title: 'Start trip', label: 'Start mileage (km)', type: 'number', required: true,
      value: odo, min: odo ?? 0,
      hint: odo != null ? `Vehicle odometer: ${odo.toLocaleString()} km` : undefined,
      confirmText: 'Start trip'
    }).pipe(filter(v => v != null && v !== ''))
      .subscribe(v => this.act(
        this.http.put<Trip>(`/api/v1/trips/${t.id}/start`, { startMileageKm: Number(v) }), 'Trip started'));
  }

  end(): void {
    const t = this.trip()!;
    const min = (t.startMileageKm ?? 0) + 1;
    this.dialogs.prompt({
      title: 'End trip', label: 'End mileage (km)', type: 'number', required: true, min,
      hint: `Start mileage: ${(t.startMileageKm ?? 0).toLocaleString()} km`, confirmText: 'End trip'
    }).pipe(filter(v => v != null && v !== ''))
      .subscribe(v => this.act(
        this.http.put<Trip>(`/api/v1/trips/${t.id}/end`, { endMileageKm: Number(v) }), 'Trip completed'));
  }

  close(): void {
    const t = this.trip()!;
    this.dialogs.confirm({
      title: 'Close trip', message: `Close ${t.tripNumber}? Closed trips can no longer change.`, confirmText: 'Close trip'
    }).pipe(filter(Boolean))
      .subscribe(() => this.act(this.http.put<Trip>(`/api/v1/trips/${t.id}/close`, {}), 'Trip closed'));
  }

  private act(request: Observable<Trip>, message: string): void {
    this.busy.set(true);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.notify.success(message);
        this.load();
      },
      error: () => this.busy.set(false)
    });
  }

  private loadOdometer(vehicleId: number): void {
    // Only a convenience default for the start prompt, so stay quiet if it fails
    const context = new HttpContext().set(SILENT_ERRORS, true);
    this.http.get<{ currentOdometerKm: number }>(`/api/v1/vehicles/${vehicleId}`, { context })
      .subscribe({ next: v => this.vehicleOdometer.set(v.currentOdometerKm ?? null), error: () => {} });
  }
}
