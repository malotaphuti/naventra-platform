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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-fuel-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatSnackBarModule
  ],
  template: `
    <h1>Record Fuel Entry</h1>
    <mat-card>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Vehicle ID</mat-label>
            <input matInput type="number" formControlName="vehicleId">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Driver ID</mat-label>
            <input matInput type="number" formControlName="driverId">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Fuel Type</mat-label>
            <mat-select formControlName="fuelType">
              <mat-option value="Diesel">Diesel</mat-option>
              <mat-option value="Petrol">Petrol</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Litres</mat-label>
            <input matInput type="number" formControlName="litres">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Cost per Litre (R)</mat-label>
            <input matInput type="number" formControlName="costPerLitre">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Odometer (km)</mat-label>
            <input matInput type="number" formControlName="odometerReadingKm">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Station</mat-label>
            <input matInput formControlName="station">
          </mat-form-field>
          <div class="form-actions">
            <button mat-button type="button" (click)="cancel()">Cancel</button>
            <button mat-raised-button color="primary" type="submit"
                    [disabled]="form.invalid">Record Entry</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 1rem; }
  `]
})
export class FuelFormComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  form = this.fb.group({
    vehicleId: [null as number | null, Validators.required],
    driverId: [null as number | null, Validators.required],
    fuelType: ['Diesel', Validators.required],
    litres: [null as number | null, [Validators.required, Validators.min(0.1)]],
    costPerLitre: [null as number | null, [Validators.required, Validators.min(0.01)]],
    odometerReadingKm: [null as number | null, [Validators.required, Validators.min(0)]],
    station: [''],
    filledAt: [new Date().toISOString()]
  });

  onSubmit() {
    if (this.form.invalid) return;
    this.http.post('/api/v1/fuel', this.form.value).subscribe({
      next: () => {
        this.snackBar.open('Fuel entry recorded', 'Close', { duration: 3000 });
        this.router.navigate(['/fuel']);
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Failed', 'Close', { duration: 5000 })
    });
  }

  cancel() { this.router.navigate(['/fuel']); }
}
