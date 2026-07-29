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
  selector: 'app-maintenance-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatSnackBarModule
  ],
  template: `
    <h1>Create Work Order</h1>
    <mat-card>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Vehicle ID</mat-label>
            <input matInput type="number" formControlName="vehicleId">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Type</mat-label>
            <mat-select formControlName="type">
              <mat-option value="PREVENTIVE">Preventive</mat-option>
              <mat-option value="CORRECTIVE">Corrective</mat-option>
              <mat-option value="EMERGENCY">Emergency</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-span">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3"></textarea>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Workshop</mat-label>
            <input matInput formControlName="workshop">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Mechanic</mat-label>
            <input matInput formControlName="mechanicName">
          </mat-form-field>
          <div class="form-actions">
            <button mat-button type="button" (click)="cancel()">Cancel</button>
            <button mat-raised-button color="primary" type="submit"
                    [disabled]="form.invalid">Create Work Order</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .full-span { grid-column: 1 / -1; }
    .form-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 1rem; }
  `]
})
export class MaintenanceFormComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  form = this.fb.group({
    vehicleId: [null as number | null, Validators.required],
    type: ['', Validators.required],
    description: ['', Validators.required],
    workshop: [''],
    mechanicName: ['']
  });

  onSubmit() {
    if (this.form.invalid) return;
    this.http.post('/api/v1/maintenance', this.form.value).subscribe({
      next: () => {
        this.snackBar.open('Work order created', 'Close', { duration: 3000 });
        this.router.navigate(['/maintenance']);
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Failed', 'Close', { duration: 5000 })
    });
  }

  cancel() { this.router.navigate(['/maintenance']); }
}
