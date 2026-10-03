import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, map } from 'rxjs';
import { AuthStore } from '../../../core/stores/auth.store';
import { NotifyService } from '../../../core/services/notify.service';
import { Page } from '../../../core/models/page.model';
import { DriverDashboard } from '../../dashboard/dashboard.models';
import { Trip } from '../trip.models';

interface DriverOption { id: number; fullName: string; employeeNumber: string; status: string; }
interface VehicleOption { id: number; registrationNumber: string; make: string; model: string; year: number; }

@Component({
  selector: 'app-trip-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule
  ],
  template: `
    <a class="back-link" [routerLink]="base"><mat-icon>arrow_back</mat-icon> Back to {{ isDriver ? 'my trips' : 'trips' }}</a>

    <div class="page-head">
      <div>
        <h1>Request a trip</h1>
        <p>{{ isDriver ? 'Your request goes to the fleet manager for approval.' : 'Create a trip request for a driver and vehicle.' }}</p>
      </div>
    </div>

    @if (loading()) {
      <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
    } @else {
      <form class="form-card" [formGroup]="form" (ngSubmit)="submit()">
        <h2>Assignment</h2>
        <div class="form-grid">
          @if (!isDriver) {
            <mat-form-field appearance="outline">
              <mat-label>Driver</mat-label>
              <mat-select formControlName="driverId">
                @for (d of drivers(); track d.id) {
                  <mat-option [value]="d.id">{{ d.fullName }} · {{ d.employeeNumber }}</mat-option>
                }
              </mat-select>
              @if (!drivers().length) { <mat-hint>No active drivers available</mat-hint> }
              <mat-error>Driver is required</mat-error>
            </mat-form-field>
          }
          <mat-form-field appearance="outline" [class.full]="isDriver">
            <mat-label>Vehicle</mat-label>
            <mat-select formControlName="vehicleId">
              @for (v of vehicles(); track v.id) {
                <mat-option [value]="v.id">{{ v.registrationNumber }} · {{ v.make }} {{ v.model }} ({{ v.year }})</mat-option>
              }
            </mat-select>
            @if (!vehicles().length) { <mat-hint>No vehicles are available right now</mat-hint> }
            <mat-error>Vehicle is required</mat-error>
          </mat-form-field>
        </div>

        <h2>Journey</h2>
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Origin</mat-label>
            <input matInput formControlName="origin" maxlength="255">
            <mat-error>Origin is required</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Destination</mat-label>
            <input matInput formControlName="destination" maxlength="255">
            <mat-error>Destination is required</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Purpose</mat-label>
            <input matInput formControlName="purpose" maxlength="255">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Passengers</mat-label>
            <input matInput type="number" min="0" formControlName="passengers">
            <mat-error>Must be 0 or more</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Cargo</mat-label>
            <input matInput formControlName="cargo" maxlength="255">
          </mat-form-field>
        </div>

        <div class="form-actions">
          <a mat-stroked-button [routerLink]="base">Cancel</a>
          <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Submitting…' : 'Submit request' }}
          </button>
        </div>
      </form>
    }
  `
})
export class TripFormComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  readonly isDriver = this.auth.hasRole('DRIVER');
  readonly base = this.isDriver ? '/my-trips' : '/trips';

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly drivers = signal<DriverOption[]>([]);
  readonly vehicles = signal<VehicleOption[]>([]);

  readonly form = this.fb.group({
    driverId: [null as number | null, this.isDriver ? [] : [Validators.required]],
    vehicleId: [null as number | null, Validators.required],
    origin: ['', Validators.required],
    destination: ['', Validators.required],
    purpose: [''],
    passengers: [null as number | null, Validators.min(0)],
    cargo: ['']
  });

  ngOnInit(): void {
    if (this.isDriver) {
      forkJoin({
        vehicles: this.http.get<Page<VehicleOption>>('/api/v1/vehicles?status=AVAILABLE&size=100').pipe(map(p => p.content)),
        me: this.http.get<DriverDashboard>('/api/v1/dashboard/driver')
      }).subscribe({
        next: ({ vehicles, me }) => {
          this.vehicles.set(vehicles);
          const assigned = me.assignedVehicle?.id;
          if (assigned && vehicles.some(v => v.id === assigned)) {
            this.form.patchValue({ vehicleId: assigned });
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    } else {
      forkJoin({
        drivers: this.http.get<DriverOption[]>('/api/v1/drivers/active'),
        vehicles: this.http.get<VehicleOption[]>('/api/v1/vehicles/available')
      }).subscribe({
        next: ({ drivers, vehicles }) => {
          this.drivers.set(drivers);
          this.vehicles.set(vehicles);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      driverId: this.isDriver ? null : v.driverId,
      vehicleId: v.vehicleId,
      origin: v.origin!.trim(),
      destination: v.destination!.trim(),
      purpose: v.purpose?.trim() || null,
      passengers: v.passengers ?? null,
      cargo: v.cargo?.trim() || null
    };

    this.saving.set(true);
    this.http.post<Trip>('/api/v1/trips', body).subscribe({
      next: trip => {
        this.notify.success(`Trip ${trip.tripNumber} requested`);
        this.router.navigate([this.base, trip.id]);
      },
      error: () => this.saving.set(false)
    });
  }
}
