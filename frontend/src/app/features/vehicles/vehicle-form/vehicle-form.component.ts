import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatDatepickerModule,
    MatNativeDateModule, MatSnackBarModule
  ],
  template: `
    <h1>Register Vehicle</h1>
    <mat-card>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Registration Number</mat-label>
            <input matInput formControlName="registrationNumber">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>VIN</mat-label>
            <input matInput formControlName="vin" maxlength="17">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Make</mat-label>
            <input matInput formControlName="make">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Model</mat-label>
            <input matInput formControlName="model">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Year</mat-label>
            <input matInput type="number" formControlName="year">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Color</mat-label>
            <input matInput formControlName="color">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Fuel Type</mat-label>
            <mat-select formControlName="fuelType">
              <mat-option value="Petrol">Petrol</mat-option>
              <mat-option value="Diesel">Diesel</mat-option>
              <mat-option value="Electric">Electric</mat-option>
              <mat-option value="Hybrid">Hybrid</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Odometer (km)</mat-label>
            <input matInput type="number" formControlName="currentOdometerKm">
          </mat-form-field>

          <div class="form-actions">
            <button mat-button type="button" (click)="cancel()">Cancel</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">
              Register Vehicle
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .form-actions {
      grid-column: 1 / -1;
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1rem;
    }
  `]
})
export class VehicleFormComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  form = this.fb.group({
    registrationNumber: ['', Validators.required],
    vin: ['', [Validators.minLength(17), Validators.maxLength(17)]],
    make: ['', Validators.required],
    model: ['', Validators.required],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(1900)]],
    color: [''],
    fuelType: ['Diesel'],
    currentOdometerKm: [0, Validators.min(0)]
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.http.post('/api/v1/vehicles', this.form.value).subscribe({
      next: () => {
        this.snackBar.open('Vehicle registered successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/vehicles']);
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to register vehicle', 'Close', { duration: 5000 });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/vehicles']);
  }
}
