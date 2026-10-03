import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { toDateTimeInput, toLocalDateTime } from '../../../core/models/page.model';
import { AuthStore } from '../../../core/stores/auth.store';
import { NotifyService } from '../../../core/services/notify.service';
import { humanize } from '../../dashboard/dashboard.models';
import {
  DriverOption, TripOption, VehicleOption, loadActiveDrivers, loadDriverContext, loadTripsInProgress,
  loadVehicles, vehicleLabel
} from '../../fuel/fleet-lookups';
import { INCIDENT_SEVERITIES, INCIDENT_TYPES, Incident } from '../incident.models';

@Component({
  selector: 'app-incident-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <a class="back-link" routerLink="/incidents"><mat-icon>arrow_back</mat-icon> Incidents</a>
    <div class="page-head">
      <div>
        <h1>Report incident</h1>
        <p>High or critical accidents, breakdowns and mechanical failures take an available vehicle out of service automatically.</p>
      </div>
    </div>

    @if (loading()) {
      <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (isDriver && vehicles().length === 0) {
      <div class="panel">
        <div class="empty">
          <mat-icon>no_crash</mat-icon>
          You have no assigned vehicle and no trip in progress, so there is no vehicle to report against.
          Contact your fleet manager directly.
        </div>
      </div>
    } @else {
      <form class="form-card" [formGroup]="form" (ngSubmit)="submit()">
        <h2>What happened</h2>
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Type</mat-label>
            <mat-select formControlName="type">
              @for (t of types; track t) { <mat-option [value]="t">{{ humanize(t) }}</mat-option> }
            </mat-select>
            <mat-error>Select the incident type</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Severity</mat-label>
            <mat-select formControlName="severity">
              @for (s of severities; track s) { <mat-option [value]="s">{{ humanize(s) }}</mat-option> }
            </mat-select>
            <mat-error>Select the severity</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Description</mat-label>
            <textarea matInput rows="4" formControlName="description" maxlength="4000"
                      placeholder="Describe what happened, damage, injuries, other parties involved"></textarea>
            <mat-error>Describe the incident</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Location</mat-label>
            <input matInput formControlName="location" maxlength="255" placeholder="e.g. N3 near Harrismith">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Occurred at</mat-label>
            <input matInput type="datetime-local" formControlName="occurredAt" [max]="maxDateTime">
            <mat-error>Enter when it happened</mat-error>
          </mat-form-field>
        </div>

        <h2>Vehicle and driver</h2>
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Vehicle</mat-label>
            <mat-select formControlName="vehicleId" (selectionChange)="onVehicleChange()">
              @for (v of vehicles(); track v.id) {
                <mat-option [value]="v.id">{{ label(v) }}</mat-option>
              }
            </mat-select>
            <mat-error>Select a vehicle</mat-error>
          </mat-form-field>
          @if (!isDriver) {
            <mat-form-field appearance="outline">
              <mat-label>Driver</mat-label>
              <mat-select formControlName="driverId">
                @for (d of drivers(); track d.id) {
                  <mat-option [value]="d.id">{{ d.fullName }} · {{ d.employeeNumber }}</mat-option>
                }
              </mat-select>
              <mat-error>Select the driver involved</mat-error>
            </mat-form-field>
          }
          <mat-form-field appearance="outline">
            <mat-label>Trip (optional)</mat-label>
            <mat-select formControlName="tripId" (selectionChange)="onTripChange()">
              <mat-option [value]="null">Not during a trip</mat-option>
              @for (t of tripsForVehicle(); track t.id) {
                <mat-option [value]="t.id">{{ t.tripNumber }} · {{ t.origin }} → {{ t.destination }}</mat-option>
              }
            </mat-select>
            @if (tripsForVehicle().length === 0) { <mat-hint>No trip in progress for this vehicle</mat-hint> }
          </mat-form-field>
        </div>

        <div class="form-actions">
          <a mat-stroked-button routerLink="/incidents">Cancel</a>
          <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Submitting…' : 'Report incident' }}
          </button>
        </div>
      </form>
    }
  `
})
export class IncidentFormComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthStore);
  private readonly notify = inject(NotifyService);

  readonly isDriver = this.auth.hasRole('DRIVER');
  readonly types = INCIDENT_TYPES;
  readonly severities = INCIDENT_SEVERITIES;
  readonly humanize = humanize;
  readonly label = vehicleLabel;
  readonly maxDateTime = toDateTimeInput(new Date());

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly vehicles = signal<VehicleOption[]>([]);
  readonly drivers = signal<DriverOption[]>([]);
  readonly trips = signal<TripOption[]>([]);
  readonly tripsForVehicle = signal<TripOption[]>([]);

  readonly form = this.fb.group({
    type: [null as string | null, Validators.required],
    severity: ['MEDIUM', Validators.required],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    location: [''],
    occurredAt: [toDateTimeInput(new Date()), Validators.required],
    vehicleId: [null as number | null, Validators.required],
    driverId: [null as number | null, this.isDriver ? [] : [Validators.required]],
    tripId: [null as number | null]
  });

  ngOnInit() {
    if (this.isDriver) {
      loadDriverContext(this.http).subscribe({
        next: ctx => {
          this.vehicles.set(ctx.vehicles);
          this.trips.set(ctx.activeTrip ? [ctx.activeTrip] : []);
          if (ctx.vehicles.length) {
            this.form.controls.vehicleId.setValue(ctx.vehicles[0].id);
            if (ctx.vehicles.length === 1) this.form.controls.vehicleId.disable();
            this.onVehicleChange();
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    } else {
      forkJoin([loadVehicles(this.http), loadActiveDrivers(this.http), loadTripsInProgress(this.http)]).subscribe({
        next: ([vehicles, drivers, trips]) => {
          this.vehicles.set(vehicles.filter(v => v.status !== 'RETIRED'));
          this.drivers.set(drivers);
          this.trips.set(trips);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    }
  }

  onVehicleChange() {
    const id = this.form.controls.vehicleId.value;
    const vehicle = this.vehicles().find(v => v.id === id);
    const trips = this.trips().filter(t => t.vehicleId === id);
    this.tripsForVehicle.set(trips);
    this.form.controls.tripId.setValue(trips.length === 1 ? trips[0].id : null);
    if (!this.isDriver) {
      if (trips.length === 1) {
        this.form.controls.driverId.setValue(trips[0].driverId);
      } else if (vehicle?.assignedDriverId && !this.form.controls.driverId.value) {
        this.form.controls.driverId.setValue(vehicle.assignedDriverId);
      }
    }
  }

  onTripChange() {
    const trip = this.trips().find(t => t.id === this.form.controls.tripId.value);
    if (trip && !this.isDriver) this.form.controls.driverId.setValue(trip.driverId);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      vehicleId: v.vehicleId,
      driverId: this.isDriver ? null : v.driverId,
      tripId: v.tripId,
      type: v.type,
      severity: v.severity,
      description: v.description?.trim(),
      location: v.location?.trim() || null,
      occurredAt: toLocalDateTime(new Date(v.occurredAt!))
    };
    this.saving.set(true);
    this.http.post<Incident>('/api/v1/incidents', body).subscribe({
      next: inc => {
        const grounded = inc.vehicleStatus === 'OUT_OF_SERVICE' ? ' · vehicle taken out of service' : '';
        this.notify.success(`${inc.incidentNumber} reported${grounded}`);
        this.router.navigate(['/incidents', inc.id]);
      },
      error: () => this.saving.set(false)
    });
  }
}
