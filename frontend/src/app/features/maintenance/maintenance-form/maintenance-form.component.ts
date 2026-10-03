import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideNativeDateAdapter } from '@angular/material/core';
import { toLocalDate } from '../../../core/models/page.model';
import { NotifyService } from '../../../core/services/notify.service';
import { humanize } from '../../dashboard/dashboard.models';
import { VehicleOption, loadVehicles } from '../../fuel/fleet-lookups';
import { MAINTENANCE_TYPES, SERVICE_TYPES, WorkOrder } from '../maintenance.models';

@Component({
  selector: 'app-maintenance-form',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, MatProgressSpinnerModule
  ],
  template: `
    <a class="back-link" routerLink="/maintenance"><mat-icon>arrow_back</mat-icon> Maintenance</a>
    <div class="page-head">
      <div>
        <h1>New work order</h1>
        <p>A work order dated today (or earlier) opens immediately and takes the vehicle into maintenance.
           A future date is booked as scheduled and leaves the vehicle in service until work starts.</p>
      </div>
    </div>

    @if (loading()) {
      <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
    } @else {
      <form class="form-card" [formGroup]="form" (ngSubmit)="submit()">
        <h2>Vehicle and job</h2>
        <div class="form-grid">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Vehicle</mat-label>
            <mat-select formControlName="vehicleId" (selectionChange)="onVehicleChange()">
              @for (v of vehicles(); track v.id) {
                <mat-option [value]="v.id">{{ v.registrationNumber }} · {{ v.make }} {{ v.model }} — {{ humanize(v.status) }}</mat-option>
              }
            </mat-select>
            @if (selected(); as v) {
              <mat-hint>Odometer {{ v.currentOdometerKm | number }} km · currently {{ humanize(v.status) }}</mat-hint>
            }
            <mat-error>Select a vehicle</mat-error>
          </mat-form-field>

          @if (blockedWarning(); as warning) {
            <div class="full warn"><mat-icon>warning</mat-icon><span>{{ warning }}</span></div>
          }

          <mat-form-field appearance="outline">
            <mat-label>Type</mat-label>
            <mat-select formControlName="type">
              @for (t of types; track t) { <mat-option [value]="t">{{ humanize(t) }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Service type</mat-label>
            <mat-select formControlName="serviceType">
              <mat-option [value]="null">—</mat-option>
              @for (s of serviceTypes; track s) { <mat-option [value]="s">{{ s }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Description</mat-label>
            <textarea matInput rows="3" formControlName="description" maxlength="2000"
                      placeholder="What needs to be done?"></textarea>
            <mat-error>Describe the work</mat-error>
          </mat-form-field>
        </div>

        <h2>Workshop and schedule</h2>
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Workshop</mat-label>
            <input matInput formControlName="workshop" maxlength="100">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Mechanic</mat-label>
            <input matInput formControlName="mechanicName" maxlength="100">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Scheduled date</mat-label>
            <input matInput [matDatepicker]="dp" formControlName="scheduledDate">
            <mat-datepicker-toggle matIconSuffix [for]="dp"></mat-datepicker-toggle>
            <mat-datepicker #dp></mat-datepicker>
            <mat-hint>{{ isFuture() ? 'Will be booked as scheduled' : 'Opens today' }}</mat-hint>
          </mat-form-field>
          <div></div>
          <mat-form-field appearance="outline">
            <mat-label>Labour cost (estimate)</mat-label>
            <span matTextPrefix>R&nbsp;</span>
            <input matInput type="number" min="0" step="0.01" formControlName="labourCost">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Parts cost (estimate)</mat-label>
            <span matTextPrefix>R&nbsp;</span>
            <input matInput type="number" min="0" step="0.01" formControlName="partsCost">
          </mat-form-field>
        </div>

        <div class="form-actions">
          <a mat-stroked-button routerLink="/maintenance">Cancel</a>
          <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Create work order' }}
          </button>
        </div>
      </form>
    }
  `,
  styles: [`
    .warn { display: flex; gap: 0.5rem; align-items: flex-start; padding: 0.75rem 1rem; margin-bottom: 1rem;
      border-radius: 10px; background: #fef3c7; color: #92400e; font-size: 0.85rem; }
  `]
})
export class MaintenanceFormComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotifyService);

  readonly types = MAINTENANCE_TYPES;
  readonly serviceTypes = SERVICE_TYPES;
  readonly humanize = humanize;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly vehicles = signal<VehicleOption[]>([]);
  readonly selected = signal<VehicleOption | null>(null);

  readonly form = this.fb.group({
    vehicleId: [null as number | null, Validators.required],
    type: ['PREVENTIVE', Validators.required],
    serviceType: [null as string | null],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    workshop: [''],
    mechanicName: [''],
    scheduledDate: [new Date() as Date | null],
    labourCost: [null as number | null, Validators.min(0)],
    partsCost: [null as number | null, Validators.min(0)]
  });

  ngOnInit() {
    loadVehicles(this.http).subscribe({
      next: list => {
        this.vehicles.set(list.filter(v => v.status !== 'RETIRED'));
        const preset = Number(this.route.snapshot.queryParamMap.get('vehicleId'));
        if (preset && this.vehicles().some(v => v.id === preset)) {
          this.form.controls.vehicleId.setValue(preset);
          this.onVehicleChange();
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onVehicleChange() {
    const id = this.form.controls.vehicleId.value;
    this.selected.set(this.vehicles().find(v => v.id === id) ?? null);
  }

  isFuture(): boolean {
    const d = this.form.controls.scheduledDate.value;
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime();
  }

  blockedWarning(): string | null {
    const v = this.selected();
    if (!v || this.isFuture()) return null;
    if (v.status === 'ON_TRIP') return `${v.registrationNumber} is on a trip. End the trip first, or schedule this work order for a later date.`;
    if (v.status === 'RESERVED') return `${v.registrationNumber} is reserved for a trip. Release it first, or schedule this work order for a later date.`;
    return null;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      vehicleId: v.vehicleId,
      type: v.type,
      serviceType: v.serviceType,
      description: v.description?.trim(),
      workshop: v.workshop?.trim() || null,
      mechanicName: v.mechanicName?.trim() || null,
      scheduledDate: v.scheduledDate ? toLocalDate(v.scheduledDate) : null,
      labourCost: v.labourCost,
      partsCost: v.partsCost
    };
    this.saving.set(true);
    this.http.post<WorkOrder>('/api/v1/maintenance', body).subscribe({
      next: wo => {
        this.notify.success(`${wo.workOrderNumber} created (${humanize(wo.status).toLowerCase()})`);
        this.router.navigate(['/maintenance', wo.id]);
      },
      error: () => this.saving.set(false)
    });
  }
}
