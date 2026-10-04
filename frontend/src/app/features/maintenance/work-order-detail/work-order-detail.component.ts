import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Observable, filter } from 'rxjs';
import { toLocalDate } from '../../../core/models/page.model';
import { AuthStore } from '../../../core/stores/auth.store';
import { NotifyService } from '../../../core/services/notify.service';
import { DialogService } from '../../../shared/dialogs/dialog.service';
import { humanize } from '../../dashboard/dashboard.models';
import { MAINTAINER_ROLES, SERVICE_TYPES, WorkOrder, parseLocalDate } from '../maintenance.models';

type Mode = 'view' | 'edit' | 'complete';

@Component({
  selector: 'app-work-order-detail',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDatepickerModule, MatProgressSpinnerModule
  ],
  template: `
    <a class="back-link" routerLink="/maintenance"><mat-icon>arrow_back</mat-icon> Maintenance</a>

    @if (loading()) {
      <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
    } @else {
      @if (wo(); as w) {
      <div class="page-head">
        <div>
          <h1>{{ w.workOrderNumber }} <span class="pill" [attr.data-status]="w.status">{{ humanize(w.status) }}</span></h1>
          <p>{{ humanize(w.type) }}{{ w.serviceType ? ' · ' + w.serviceType : '' }} · {{ w.vehicleRegistration }} ({{ w.vehicleMake }} {{ w.vehicleModel }})</p>
        </div>
        @if (canManage && mode() === 'view') {
          <div class="detail-actions">
            @if (is(w, 'SCHEDULED', 'OPEN')) {
              <button mat-flat-button color="primary" (click)="act('start', 'Work started')" [disabled]="busy()"><mat-icon>play_arrow</mat-icon> Start work</button>
            }
            @if (is(w, 'OPEN', 'IN_PROGRESS')) {
              <button mat-stroked-button (click)="act('awaiting-parts', 'Marked as awaiting parts')" [disabled]="busy()"><mat-icon>inventory_2</mat-icon> Awaiting parts</button>
            }
            @if (is(w, 'AWAITING_PARTS')) {
              <button mat-flat-button color="primary" (click)="act('resume', 'Work resumed')" [disabled]="busy()"><mat-icon>play_arrow</mat-icon> Resume</button>
            }
            @if (is(w, 'OPEN', 'IN_PROGRESS', 'AWAITING_PARTS')) {
              <button mat-flat-button color="primary" (click)="openComplete(w)" [disabled]="busy()"><mat-icon>task_alt</mat-icon> Complete</button>
            }
            @if (!is(w, 'CANCELLED')) {
              <button mat-stroked-button (click)="openEdit(w)" [disabled]="busy()"><mat-icon>edit</mat-icon> {{ is(w, 'COMPLETED') ? 'Update costs' : 'Edit' }}</button>
            }
            @if (!is(w, 'COMPLETED', 'CANCELLED')) {
              <button mat-stroked-button color="warn" (click)="cancel(w)" [disabled]="busy()"><mat-icon>block</mat-icon> Cancel</button>
            }
          </div>
        }
      </div>

      @if (mode() === 'edit') {
        <form class="form-card block" [formGroup]="editForm" (ngSubmit)="saveEdit(w)">
          <h2>Edit work order</h2>
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
              <mat-label>Service type</mat-label>
              <mat-select formControlName="serviceType">
                <mat-option [value]="null">—</mat-option>
                @for (s of serviceTypes; track s) { <mat-option [value]="s">{{ s }}</mat-option> }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Scheduled date</mat-label>
              <input matInput [matDatepicker]="sd" formControlName="scheduledDate">
              <mat-datepicker-toggle matIconSuffix [for]="sd"></mat-datepicker-toggle>
              <mat-datepicker #sd></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Labour cost</mat-label>
              <span matTextPrefix>R&nbsp;</span>
              <input matInput type="number" min="0" step="0.01" formControlName="labourCost">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Parts cost</mat-label>
              <span matTextPrefix>R&nbsp;</span>
              <input matInput type="number" min="0" step="0.01" formControlName="partsCost">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Invoice number</mat-label>
              <input matInput formControlName="invoiceNumber" maxlength="50">
            </mat-form-field>
            <div></div>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Parts used</mat-label>
              <textarea matInput rows="2" formControlName="partsUsed"></textarea>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Notes</mat-label>
              <textarea matInput rows="3" formControlName="notes"></textarea>
            </mat-form-field>
          </div>
          <div class="form-actions">
            <button mat-stroked-button type="button" (click)="mode.set('view')">Cancel</button>
            <button mat-flat-button color="primary" type="submit" [disabled]="busy()">Save changes</button>
          </div>
        </form>
      }

      @if (mode() === 'complete') {
        <form class="form-card block" [formGroup]="completeForm" (ngSubmit)="saveComplete(w)">
          <h2>Complete work order</h2>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Labour cost</mat-label>
              <span matTextPrefix>R&nbsp;</span>
              <input matInput type="number" min="0" step="0.01" formControlName="labourCost">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Parts cost</mat-label>
              <span matTextPrefix>R&nbsp;</span>
              <input matInput type="number" min="0" step="0.01" formControlName="partsCost">
              <mat-hint>Total R{{ completeTotal() | number:'1.2-2' }}</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Invoice number</mat-label>
              <input matInput formControlName="invoiceNumber" maxlength="50">
            </mat-form-field>
            <div></div>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Parts used</mat-label>
              <textarea matInput rows="2" formControlName="partsUsed"></textarea>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Completion notes</mat-label>
              <textarea matInput rows="2" formControlName="notes"></textarea>
            </mat-form-field>
          </div>
          <h2>Next service</h2>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Next service date</mat-label>
              <input matInput [matDatepicker]="nd" formControlName="nextServiceDate">
              <mat-datepicker-toggle matIconSuffix [for]="nd"></mat-datepicker-toggle>
              <mat-datepicker #nd></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Next service at (km)</mat-label>
              <input matInput type="number" min="0" formControlName="nextServiceMileageKm">
              @if (w.vehicleOdometerKm != null) { <mat-hint>Odometer now {{ w.vehicleOdometerKm | number }} km</mat-hint> }
            </mat-form-field>
          </div>
          <div class="form-actions">
            <button mat-stroked-button type="button" (click)="mode.set('view')">Back</button>
            <button mat-flat-button color="primary" type="submit" [disabled]="busy()">Mark completed</button>
          </div>
        </form>
      }

      <div class="panel-grid">
        <section class="panel span-8">
          <div class="panel-head"><h2>Job</h2></div>
          <p class="text">{{ w.description }}</p>
          <div class="facts">
            <div class="fact"><span class="fact-label">Workshop</span><span class="fact-value">{{ w.workshop || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Mechanic</span><span class="fact-value">{{ w.mechanicName || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Scheduled</span><span class="fact-value">{{ (w.scheduledDate | date:'d MMM y') || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Started</span><span class="fact-value">{{ (w.startedDate | date:'d MMM y') || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Completed</span><span class="fact-value">{{ (w.completedDate | date:'d MMM y') || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Created</span><span class="fact-value">{{ (w.createdAt | date:'d MMM y') || '—' }}{{ w.createdBy ? ' by ' + w.createdBy : '' }}</span></div>
          </div>
          @if (w.partsUsed) {
            <h3>Parts used</h3><p class="text">{{ w.partsUsed }}</p>
          }
          @if (w.notes) {
            <h3>Notes</h3><p class="text">{{ w.notes }}</p>
          }
        </section>

        <section class="panel span-4">
          <div class="panel-head"><h2>Costs</h2></div>
          <div class="facts">
            <div class="fact"><span class="fact-label">Labour</span><span class="fact-value">{{ money(w.labourCost) }}</span></div>
            <div class="fact"><span class="fact-label">Parts</span><span class="fact-value">{{ money(w.partsCost) }}</span></div>
            <div class="fact"><span class="fact-label">Total</span><span class="fact-value">{{ money(w.totalCost) }}</span></div>
            <div class="fact"><span class="fact-label">Invoice</span><span class="fact-value">{{ w.invoiceNumber || '—' }}</span></div>
          </div>
        </section>

        <section class="panel span-6">
          <div class="panel-head">
            <h2>Vehicle</h2>
            <a [routerLink]="['/vehicles', w.vehicleId]">View vehicle</a>
          </div>
          <div class="facts">
            <div class="fact"><span class="fact-label">Registration</span><span class="fact-value">{{ w.vehicleRegistration }}</span></div>
            <div class="fact"><span class="fact-label">Status</span><span class="fact-value"><span class="pill" [attr.data-status]="w.vehicleStatus">{{ humanize(w.vehicleStatus) }}</span></span></div>
            <div class="fact"><span class="fact-label">Odometer</span><span class="fact-value">{{ w.vehicleOdometerKm != null ? (w.vehicleOdometerKm | number) + ' km' : '—' }}</span></div>
          </div>
        </section>

        <section class="panel span-6">
          <div class="panel-head"><h2>Next service</h2></div>
          <div class="facts">
            <div class="fact"><span class="fact-label">Date</span><span class="fact-value">{{ (w.nextServiceDate | date:'d MMM y') || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Mileage</span><span class="fact-value">{{ w.nextServiceMileageKm != null ? (w.nextServiceMileageKm | number) + ' km' : '—' }}</span></div>
          </div>
        </section>
      </div>
      }
    }
  `,
  styles: [`
    h1 .pill { vertical-align: middle; margin-left: 0.5rem; }
    .block { margin-bottom: 1.5rem; }
    .text { white-space: pre-line; margin: 0 0 1rem; }
    h3 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--fo-muted); margin: 1.25rem 0 0.35rem; }
  `]
})
export class WorkOrderDetailComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthStore);
  private readonly notify = inject(NotifyService);
  private readonly dialogs = inject(DialogService);

  readonly canManage = this.auth.hasAnyRole(MAINTAINER_ROLES);
  readonly serviceTypes = SERVICE_TYPES;
  readonly humanize = humanize;

  readonly wo = signal<WorkOrder | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly mode = signal<Mode>('view');

  readonly editForm = this.fb.group({
    workshop: [''],
    mechanicName: [''],
    serviceType: [null as string | null],
    scheduledDate: [null as Date | null],
    labourCost: [null as number | null, Validators.min(0)],
    partsCost: [null as number | null, Validators.min(0)],
    invoiceNumber: [''],
    partsUsed: [''],
    notes: ['']
  });

  readonly completeForm = this.fb.group({
    labourCost: [null as number | null, Validators.min(0)],
    partsCost: [null as number | null, Validators.min(0)],
    invoiceNumber: [''],
    partsUsed: [''],
    notes: [''],
    nextServiceDate: [null as Date | null],
    nextServiceMileageKm: [null as number | null, Validators.min(0)]
  });

  private get id(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.http.get<WorkOrder>(`/api/v1/maintenance/${this.id}`).subscribe({
      next: w => { this.wo.set(w); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  is(w: WorkOrder, ...statuses: string[]): boolean {
    return statuses.includes(w.status);
  }

  money(v: number | null): string {
    return v == null ? '—' : 'R' + Number(v).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  act(action: string, message: string) {
    this.run(this.http.put<WorkOrder>(`/api/v1/maintenance/${this.id}/${action}`, {}), message);
  }

  cancel(w: WorkOrder) {
    this.dialogs.prompt({
      title: `Cancel ${w.workOrderNumber}?`,
      message: 'The vehicle returns to service if no other work order is holding it in maintenance.',
      label: 'Reason',
      type: 'textarea',
      required: true,
      confirmText: 'Cancel work order',
      danger: true
    }).pipe(filter(reason => reason != null)).subscribe(reason =>
      this.run(this.http.put<WorkOrder>(`/api/v1/maintenance/${this.id}/cancel`, {}, { params: { reason: String(reason) } }),
        'Work order cancelled'));
  }

  openEdit(w: WorkOrder) {
    this.editForm.reset({
      workshop: w.workshop ?? '',
      mechanicName: w.mechanicName ?? '',
      serviceType: w.serviceType,
      scheduledDate: parseLocalDate(w.scheduledDate),
      labourCost: w.labourCost,
      partsCost: w.partsCost,
      invoiceNumber: w.invoiceNumber ?? '',
      partsUsed: w.partsUsed ?? '',
      notes: w.notes ?? ''
    });
    this.mode.set('edit');
  }

  saveEdit(w: WorkOrder) {
    if (this.editForm.invalid) return;
    const v = this.editForm.getRawValue();
    const body = {
      ...v,
      scheduledDate: v.scheduledDate ? toLocalDate(v.scheduledDate) : null
    };
    this.run(this.http.put<WorkOrder>(`/api/v1/maintenance/${w.id}`, body), 'Work order updated');
  }

  openComplete(w: WorkOrder) {
    this.completeForm.reset({
      labourCost: w.labourCost,
      partsCost: w.partsCost,
      invoiceNumber: w.invoiceNumber ?? '',
      partsUsed: w.partsUsed ?? '',
      notes: '',
      nextServiceDate: null,
      nextServiceMileageKm: null
    });
    this.mode.set('complete');
  }

  completeTotal(): number {
    const { labourCost, partsCost } = this.completeForm.getRawValue();
    return (Number(labourCost) || 0) + (Number(partsCost) || 0);
  }

  saveComplete(w: WorkOrder) {
    if (this.completeForm.invalid) return;
    const v = this.completeForm.getRawValue();
    const body = {
      labourCost: v.labourCost,
      partsCost: v.partsCost,
      invoiceNumber: v.invoiceNumber?.trim() || null,
      partsUsed: v.partsUsed?.trim() || null,
      notes: v.notes?.trim() || null,
      nextServiceDate: v.nextServiceDate ? toLocalDate(v.nextServiceDate) : null,
      nextServiceMileageKm: v.nextServiceMileageKm
    };
    this.run(this.http.put<WorkOrder>(`/api/v1/maintenance/${w.id}/complete`, body), `${w.workOrderNumber} completed`);
  }

  private run(request: Observable<WorkOrder>, message: string) {
    this.busy.set(true);
    request.subscribe({
      next: updated => {
        this.wo.set(updated);
        this.mode.set('view');
        this.busy.set(false);
        this.notify.success(message);
      },
      error: () => this.busy.set(false)
    });
  }
}
