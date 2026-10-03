import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideNativeDateAdapter } from '@angular/material/core';
import { NotifyService } from '../../../core/services/notify.service';
import { toLocalDate } from '../../../core/models/page.model';
import { FUEL_TYPES, Vehicle } from '../vehicle.models';

const DATE_FIELDS = ['purchaseDate', 'licenseExpiryDate', 'insuranceExpiryDate', 'nextServiceDate'] as const;

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, MatProgressSpinnerModule
  ],
  template: `
    <a class="back-link" [routerLink]="backLink"><mat-icon>arrow_back</mat-icon> {{ editId ? 'Back to vehicle' : 'Back to vehicles' }}</a>
    <div class="page-head">
      <div>
        <h1>{{ editId ? 'Edit vehicle' : 'Add vehicle' }}</h1>
        <p>{{ editId ? 'Update vehicle details. The registration number cannot be changed.' : 'Register a new vehicle in the fleet.' }}</p>
      </div>
    </div>

    @if (loading()) {
      <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
    } @else {
      <form class="form-card" [formGroup]="form" (ngSubmit)="submit()">
        <h2>Identity</h2>
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Registration number</mat-label>
            <input matInput formControlName="registrationNumber" maxlength="20" [readonly]="!!editId">
            @if (editId) { <mat-hint>Read-only</mat-hint> }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>VIN</mat-label>
            <input matInput formControlName="vin" maxlength="17">
            <mat-error>VIN must be 17 characters</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Engine number</mat-label>
            <input matInput formControlName="engineNumber" maxlength="30">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Chassis number</mat-label>
            <input matInput formControlName="chassisNumber" maxlength="30">
          </mat-form-field>
        </div>

        <h2>Specs</h2>
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Make</mat-label>
            <input matInput formControlName="make" maxlength="50">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Model</mat-label>
            <input matInput formControlName="model" maxlength="50">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Variant</mat-label>
            <input matInput formControlName="variant" maxlength="50">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Year</mat-label>
            <input matInput type="number" formControlName="year">
            <mat-error>Year must be between 1900 and 2100</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Colour</mat-label>
            <input matInput formControlName="color" maxlength="30">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Fuel type</mat-label>
            <mat-select formControlName="fuelType">
              @for (f of fuelTypes; track f) { <mat-option [value]="f">{{ f }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Seating capacity</mat-label>
            <input matInput type="number" formControlName="seatingCapacity" min="0">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Engine capacity (cc)</mat-label>
            <input matInput type="number" formControlName="engineCapacityCc" min="0">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Odometer (km)</mat-label>
            <input matInput type="number" formControlName="currentOdometerKm" min="0">
          </mat-form-field>
        </div>

        <h2>Purchase</h2>
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Purchase date</mat-label>
            <input matInput [matDatepicker]="purchasePicker" formControlName="purchaseDate">
            <mat-datepicker-toggle matIconSuffix [for]="purchasePicker"></mat-datepicker-toggle>
            <mat-datepicker #purchasePicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Purchase cost (R)</mat-label>
            <input matInput type="number" formControlName="purchaseCost" min="0">
          </mat-form-field>
        </div>

        <h2>Compliance &amp; service</h2>
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Licence disc expiry</mat-label>
            <input matInput [matDatepicker]="licPicker" formControlName="licenseExpiryDate">
            <mat-datepicker-toggle matIconSuffix [for]="licPicker"></mat-datepicker-toggle>
            <mat-datepicker #licPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Insurance provider</mat-label>
            <input matInput formControlName="insuranceProvider" maxlength="50">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Insurance policy number</mat-label>
            <input matInput formControlName="insurancePolicyNumber" maxlength="50">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Insurance expiry</mat-label>
            <input matInput [matDatepicker]="insPicker" formControlName="insuranceExpiryDate">
            <mat-datepicker-toggle matIconSuffix [for]="insPicker"></mat-datepicker-toggle>
            <mat-datepicker #insPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Next service date</mat-label>
            <input matInput [matDatepicker]="svcPicker" formControlName="nextServiceDate">
            <mat-datepicker-toggle matIconSuffix [for]="svcPicker"></mat-datepicker-toggle>
            <mat-datepicker #svcPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Next service at (km)</mat-label>
            <input matInput type="number" formControlName="nextServiceMileageKm" min="0">
          </mat-form-field>
        </div>

        <div class="form-actions">
          <a mat-stroked-button [routerLink]="backLink">Cancel</a>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Saving…' : (editId ? 'Save changes' : 'Add vehicle') }}
          </button>
        </div>
      </form>
    }
  `
})
export class VehicleFormComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotifyService);

  readonly editId: number | null = this.route.snapshot.params['id'] ? Number(this.route.snapshot.params['id']) : null;
  readonly backLink = this.editId ? ['/vehicles', this.editId] : ['/vehicles'];
  readonly fuelTypes = FUEL_TYPES;
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly form = this.fb.group({
    registrationNumber: ['', [Validators.required, Validators.maxLength(20)]],
    vin: ['', [Validators.minLength(17), Validators.maxLength(17)]],
    engineNumber: [''],
    chassisNumber: [''],
    make: ['', [Validators.required, Validators.maxLength(50)]],
    model: ['', [Validators.required, Validators.maxLength(50)]],
    variant: [''],
    year: this.fb.control<number | null>(new Date().getFullYear(), [Validators.required, Validators.min(1900), Validators.max(2100)]),
    color: [''],
    fuelType: this.fb.control<string | null>('Diesel'),
    seatingCapacity: this.fb.control<number | null>(null, Validators.min(0)),
    engineCapacityCc: this.fb.control<number | null>(null, Validators.min(0)),
    currentOdometerKm: this.fb.control<number | null>(0, Validators.min(0)),
    purchaseDate: this.fb.control<Date | null>(null),
    purchaseCost: this.fb.control<number | null>(null, Validators.min(0)),
    licenseExpiryDate: this.fb.control<Date | null>(null),
    insuranceProvider: [''],
    insurancePolicyNumber: [''],
    insuranceExpiryDate: this.fb.control<Date | null>(null),
    nextServiceDate: this.fb.control<Date | null>(null),
    nextServiceMileageKm: this.fb.control<number | null>(null, Validators.min(0))
  });

  ngOnInit(): void {
    if (!this.editId) return;
    this.loading.set(true);
    this.http.get<Vehicle>(`/api/v1/vehicles/${this.editId}`).subscribe({
      next: v => {
        const parse = (d: string | null) => (d ? new Date(d + 'T00:00:00') : null);
        this.form.patchValue({
          ...v,
          vin: v.vin ?? '',
          seatingCapacity: v.seatingCapacity || null,
          engineCapacityCc: v.engineCapacityCc || null,
          purchaseDate: parse(v.purchaseDate),
          licenseExpiryDate: parse(v.licenseExpiryDate),
          insuranceExpiryDate: parse(v.insuranceExpiryDate),
          nextServiceDate: parse(v.nextServiceDate)
        } as any);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const raw: Record<string, any> = { ...this.form.getRawValue() };
    for (const f of DATE_FIELDS) raw[f] = raw[f] ? toLocalDate(raw[f]) : null;
    for (const [k, val] of Object.entries(raw)) {
      if (typeof val === 'string') raw[k] = val.trim();
    }
    if (!raw['vin']) raw['vin'] = this.editId ? '' : null;

    this.saving.set(true);
    let request$;
    if (this.editId) {
      delete raw['registrationNumber'];
      request$ = this.http.put<Vehicle>(`/api/v1/vehicles/${this.editId}`, raw);
    } else {
      raw['seatingCapacity'] = raw['seatingCapacity'] ?? 0;
      raw['engineCapacityCc'] = raw['engineCapacityCc'] ?? 0;
      request$ = this.http.post<Vehicle>('/api/v1/vehicles', raw);
    }

    request$.subscribe({
      next: v => {
        this.notify.success(this.editId ? 'Vehicle updated' : 'Vehicle added');
        this.router.navigate(['/vehicles', v.id]);
      },
      error: () => this.saving.set(false)
    });
  }
}
