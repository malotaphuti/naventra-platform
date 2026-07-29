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
  selector: 'app-incident-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatSnackBarModule
  ],
  template: `
    <h1>Report Incident</h1>
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
            <mat-label>Incident Type</mat-label>
            <mat-select formControlName="type">
              <mat-option value="ACCIDENT">Accident</mat-option>
              <mat-option value="BREAKDOWN">Breakdown</mat-option>
              <mat-option value="THEFT">Theft</mat-option>
              <mat-option value="TYRE_BURST">Tyre Burst</mat-option>
              <mat-option value="MECHANICAL_FAILURE">Mechanical Failure</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Severity</mat-label>
            <mat-select formControlName="severity">
              <mat-option value="LOW">Low</mat-option>
              <mat-option value="MEDIUM">Medium</mat-option>
              <mat-option value="HIGH">High</mat-option>
              <mat-option value="CRITICAL">Critical</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-span">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="4"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Location</mat-label>
            <input matInput formControlName="location">
          </mat-form-field>

          <div class="form-actions">
            <button mat-button type="button" (click)="cancel()">Cancel</button>
            <button mat-raised-button color="warn" type="submit" [disabled]="form.invalid">Report Incident</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .full-span { grid-column: 1 / -1; }
    .form-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
  `]
})
export class IncidentFormComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  form = this.fb.group({
    vehicleId: [null as number | null, Validators.required],
    driverId: [null as number | null, Validators.required],
    type: ['', Validators.required],
    severity: ['', Validators.required],
    description: ['', Validators.required],
    location: [''],
    occurredAt: [new Date().toISOString()]
  });

  onSubmit() {
    if (this.form.invalid) return;
    this.http.post('/api/v1/incidents', this.form.value).subscribe({
      next: () => {
        this.snackBar.open('Incident reported successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/incidents']);
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Failed to report', 'Close', { duration: 5000 })
    });
  }

  cancel() { this.router.navigate(['/incidents']); }
}
