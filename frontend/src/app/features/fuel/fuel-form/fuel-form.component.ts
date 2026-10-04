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
import {
  DriverOption, TripOption, VehicleOption, loadActiveDrivers, loadDriverContext, loadTripsInProgress,
  loadVehicles, vehicleLabel
} from '../fleet-lookups';
import { FUEL_TYPES } from '../../vehicles/vehicle.models';

@Component({
  selector: 'app-fuel-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <a class="back-link" routerLink="/fuel"><mat-icon>arrow_back</mat-icon> Fuel</a>
    <div class="page-head">
      <div>
        <h1>Log fuel</h1>
        <p>Record a fuel purchase. The total is calculated from litres and price per litre.</p>
      </div>
    </div>

    @if (loading()) {
      <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (isDriver && vehicles().length === 0) {
      <div class="panel">
        <div class="empty">
          <mat-icon>no_crash</mat-icon>
          You have no assigned vehicle and no trip in progress, so there is nothing to log fuel against.
          Ask your fleet manager to assign you a vehicle.
        </div>
      </div>
    } @else {
      <form class="form-card" [formGroup]="form" (ngSubmit)="submit()">
        <h2>Vehicle</h2>
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Vehicle</mat-label>
            <mat-select formControlName="vehicleId" (selectionChange)="onVehicleChange()">
              @for (v of vehicles(); track v.id) {
                <mat-option [value]="v.id">{{ label(v) }}</mat-option>
              }
            </mat-select>
            @if (isDriver) { <mat-hint>Your {{ vehicles().length > 1 ? 'assigned or trip' : '' }} vehicle</mat-hint> }
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
              <mat-error>Select the driver who filled up</mat-error>
            </mat-form-field>
          }

          <mat-form-field appearance="outline">
            <mat-label>Trip (optional)</mat-label>
            <mat-select formControlName="tripId" (selectionChange)="onTripChange()">
              <mat-option [value]="null">Not linked to a trip</mat-option>
              @for (t of tripsForVehicle(); track t.id) {
                <mat-option [value]="t.id">{{ t.tripNumber }} · {{ t.origin }} → {{ t.destination }}</mat-option>
              }
            </mat-select>
            @if (tripsForVehicle().length === 0) { <mat-hint>No trip in progress for this vehicle</mat-hint> }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Filled at</mat-label>
            <input matInput type="datetime-local" formControlName="filledAt" [max]="maxDateTime">
            <mat-error>Enter when you filled up</mat-error>
          </mat-form-field>
        </div>

        <h2>Fuel</h2>
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Fuel type</mat-label>
            <mat-select formControlName="fuelType">
              @for (f of fuelTypes; track f) { <mat-option [value]="f">{{ f }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Odometer (km)</mat-label>
            <input matInput type="number" min="0" formControlName="odometerReadingKm">
            @if (selectedVehicle()?.currentOdometerKm != null) {
              <mat-hint>Vehicle odometer: {{ selectedVehicle()!.currentOdometerKm | number }} km</mat-hint>
            }
            <mat-error>Enter the odometer reading</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Litres</mat-label>
            <input matInput type="number" min="0.1" step="0.01" formControlName="litres">
            <span matTextSuffix>L</span>
            <mat-error>Enter at least 0.1 L</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Price per litre</mat-label>
            <span matTextPrefix>R&nbsp;</span>
            <input matInput type="number" min="0.01" step="0.01" formControlName="costPerLitre">
            <mat-error>Enter the price per litre</mat-error>
          </mat-form-field>
          <div class="full total">
            <span>Total</span>
            <strong>R{{ total() | number:'1.2-2' }}</strong>
          </div>
          <mat-form-field appearance="outline">
            <mat-label>Station</mat-label>
            <input matInput formControlName="station" maxlength="100" placeholder="e.g. Engen N1 Midrand">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Notes</mat-label>
            <input matInput formControlName="notes" maxlength="2000">
          </mat-form-field>
        </div>

        <div class="form-actions">
          <a mat-stroked-button routerLink="/fuel">Cancel</a>
          <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Log fuel' }}
          </button>
        </div>
      </form>
    }
  `,
  styles: [`
    .total { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem;
      margin-bottom: 1.25rem; border-radius: 10px; background: #f8fafc; border: 1px solid var(--fo-border); }
    .total strong { font-size: 1.25rem; }
  `]
})
export class FuelFormComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthStore);
  private readonly notify = inject(NotifyService);

  readonly isDriver = this.auth.hasRole('DRIVER');
  readonly fuelTypes = FUEL_TYPES;
  readonly maxDateTime = toDateTimeInput(new Date());

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly vehicles = signal<VehicleOption[]>([]);
  readonly drivers = signal<DriverOption[]>([]);
  readonly trips = signal<TripOption[]>([]);
  readonly selectedVehicle = signal<VehicleOption | null>(null);
  readonly tripsForVehicle = signal<TripOption[]>([]);

  readonly form = this.fb.group({
    vehicleId: [null as number | null, Validators.required],
    driverId: [null as number | null, this.isDriver ? [] : [Validators.required]],
    tripId: [null as number | null],
    filledAt: [toDateTimeInput(new Date()), Validators.required],
    fuelType: ['Diesel', Validators.required],
    litres: [null as number | null, [Validators.required, Validators.min(0.1)]],
    costPerLitre: [null as number | null, [Validators.required, Validators.min(0.01)]],
    odometerReadingKm: [null as number | null, [Validators.required, Validators.min(0)]],
    station: [''],
    notes: ['']
  });

  label = vehicleLabel;

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
    const vehicle = this.vehicles().find(v => v.id === id) ?? null;
    this.selectedVehicle.set(vehicle);
    const trips = this.trips().filter(t => t.vehicleId === id);
    this.tripsForVehicle.set(trips);
    // Pre-link the trip in progress: fuel bought mid-trip almost always belongs to it.
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

  total(): number {
    const { litres, costPerLitre } = this.form.getRawValue();
    return Math.round((Number(litres) || 0) * (Number(costPerLitre) || 0) * 100) / 100;
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
      filledAt: toLocalDateTime(new Date(v.filledAt!)),
      fuelType: v.fuelType,
      litres: v.litres,
      costPerLitre: v.costPerLitre,
      odometerReadingKm: v.odometerReadingKm,
      station: v.station?.trim() || null,
      notes: v.notes?.trim() || null
    };
    this.saving.set(true);
    this.http.post<{ totalCost: number }>('/api/v1/fuel', body).subscribe({
      next: r => {
        this.notify.success(`Fuel logged · R${Number(r.totalCost).toFixed(2)}`);
        this.router.navigate(['/fuel']);
      },
      error: () => this.saving.set(false)
    });
  }
}
