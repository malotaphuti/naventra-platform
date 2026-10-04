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
import { MAINTENANCE_TYPES, SERVICE_TYPES } from '../../maintenance/maintenance.models';
import { INCIDENT_HANDLER_ROLES, Incident, severityTone } from '../incident.models';

@Component({
  selector: 'app-incident-detail',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDatepickerModule, MatProgressSpinnerModule
  ],
  template: `
    <a class="back-link" routerLink="/incidents"><mat-icon>arrow_back</mat-icon> Incidents</a>

    @if (loading()) {
      <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
    } @else {
      @if (inc(); as i) {
      <div class="page-head">
        <div>
          <h1>
            {{ i.incidentNumber }}
            <span class="pill" [attr.data-status]="i.status" [class.warn]="i.status === 'IN_MAINTENANCE'">{{ humanize(i.status) }}</span>
          </h1>
          <p>{{ humanize(i.type) }} · <span class="pill" [ngClass]="tone(i.severity)">{{ humanize(i.severity) }}</span> · {{ i.vehicleRegistration }}</p>
        </div>
        @if (canHandle && !woFormOpen()) {
          <div class="detail-actions">
            @if (i.status === 'REPORTED') {
              <button mat-stroked-button (click)="review(i)" [disabled]="busy()"><mat-icon>fact_check</mat-icon> Start review</button>
            }
            @if (i.status === 'REPORTED' || i.status === 'UNDER_REVIEW') {
              <button mat-flat-button color="primary" (click)="openWorkOrder(i)" [disabled]="busy()"><mat-icon>build</mat-icon> Create work order</button>
            }
            @if (i.status === 'REPORTED' || i.status === 'UNDER_REVIEW' || i.status === 'IN_MAINTENANCE') {
              <button mat-stroked-button (click)="resolve(i)" [disabled]="busy()"><mat-icon>task_alt</mat-icon> Resolve</button>
            }
            @if (i.status === 'RESOLVED') {
              <button mat-flat-button color="primary" (click)="close(i)" [disabled]="busy()"><mat-icon>lock</mat-icon> Close</button>
            }
          </div>
        }
      </div>

      @if (woFormOpen()) {
        <form class="form-card block" [formGroup]="woForm" (ngSubmit)="createWorkOrder(i)">
          <h2>Work order for {{ i.vehicleRegistration }}</h2>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Type</mat-label>
              <mat-select formControlName="type">
                @for (t of maintenanceTypes; track t) { <mat-option [value]="t">{{ humanize(t) }}</mat-option> }
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
              <textarea matInput rows="3" formControlName="description" maxlength="2000"></textarea>
              <mat-error>Describe the work</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Workshop</mat-label>
              <input matInput formControlName="workshop" maxlength="100">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Scheduled date</mat-label>
              <input matInput [matDatepicker]="dp" formControlName="scheduledDate">
              <mat-datepicker-toggle matIconSuffix [for]="dp"></mat-datepicker-toggle>
              <mat-datepicker #dp></mat-datepicker>
              <mat-hint>Today or earlier takes the vehicle into maintenance now</mat-hint>
            </mat-form-field>
          </div>
          <div class="form-actions">
            <button mat-stroked-button type="button" (click)="woFormOpen.set(false)">Cancel</button>
            <button mat-flat-button color="primary" type="submit" [disabled]="busy()">Create work order</button>
          </div>
        </form>
      }

      <div class="panel-grid">
        <section class="panel span-8">
          <div class="panel-head"><h2>Report</h2></div>
          <p class="text">{{ i.description }}</p>
          <div class="facts">
            <div class="fact"><span class="fact-label">Occurred</span><span class="fact-value">{{ (i.occurredAt | date:'d MMM y, HH:mm') || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Location</span><span class="fact-value">{{ i.location || '—' }}</span></div>
            <div class="fact"><span class="fact-label">Driver</span><span class="fact-value">{{ i.driverName }}</span></div>
            <div class="fact"><span class="fact-label">Reported</span><span class="fact-value">{{ (i.createdAt | date:'d MMM y, HH:mm') || '—' }}</span></div>
          </div>
        </section>

        <section class="panel span-4">
          <div class="panel-head"><h2>Links</h2></div>
          <div class="facts">
            <div class="fact">
              <span class="fact-label">Vehicle</span>
              <span class="fact-value">
                @if (canSeeVehicles) { <a [routerLink]="['/vehicles', i.vehicleId]">{{ i.vehicleRegistration }}</a> } @else { {{ i.vehicleRegistration }} }
                <span class="pill" [attr.data-status]="i.vehicleStatus">{{ humanize(i.vehicleStatus) }}</span>
              </span>
            </div>
            <div class="fact">
              <span class="fact-label">Trip</span>
              <span class="fact-value">
                @if (i.tripId) { <a [routerLink]="tripLink(i)">{{ i.tripNumber }}</a> } @else { — }
              </span>
            </div>
            <div class="fact">
              <span class="fact-label">Work order</span>
              <span class="fact-value">
                @if (i.workOrderId) {
                  @if (canHandle) { <a [routerLink]="['/maintenance', i.workOrderId]">{{ i.workOrderNumber }}</a> } @else { {{ i.workOrderNumber }} }
                  <span class="pill" [attr.data-status]="i.workOrderStatus">{{ humanize(i.workOrderStatus) }}</span>
                } @else { — }
              </span>
            </div>
          </div>
        </section>

        <section class="panel span-6">
          <div class="panel-head"><h2>Review</h2></div>
          @if (i.reviewedByName || i.reviewNotes) {
            <p class="muted">{{ i.reviewedByName ? 'Reviewed by ' + i.reviewedByName : '' }}</p>
            <p class="text">{{ i.reviewNotes || 'No review notes.' }}</p>
          } @else {
            <div class="empty"><mat-icon>hourglass_empty</mat-icon>Not reviewed yet.</div>
          }
        </section>

        <section class="panel span-6">
          <div class="panel-head"><h2>Resolution</h2></div>
          @if (i.resolutionNotes) {
            <p class="text">{{ i.resolutionNotes }}</p>
          } @else {
            <div class="empty"><mat-icon>pending</mat-icon>Not resolved yet.</div>
          }
        </section>
      </div>
      }
    }
  `,
  styles: [`
    h1 .pill { vertical-align: middle; margin-left: 0.5rem; }
    .block { margin-bottom: 1.5rem; }
    .text { white-space: pre-line; margin: 0 0 1rem; }
    .muted { color: var(--fo-muted); font-size: 0.85rem; margin: 0 0 0.35rem; }
    .fact-value .pill { margin-left: 0.4rem; }
  `]
})
export class IncidentDetailComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthStore);
  private readonly notify = inject(NotifyService);
  private readonly dialogs = inject(DialogService);

  readonly canHandle = this.auth.hasAnyRole(INCIDENT_HANDLER_ROLES);
  readonly canSeeVehicles = this.auth.hasAnyRole(['SYSTEM_ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_OFFICER', 'EXECUTIVE']);
  readonly isDriver = this.auth.hasRole('DRIVER');
  readonly maintenanceTypes = MAINTENANCE_TYPES;
  readonly serviceTypes = SERVICE_TYPES;
  readonly humanize = humanize;
  readonly tone = severityTone;

  readonly inc = signal<Incident | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly woFormOpen = signal(false);

  readonly woForm = this.fb.group({
    type: ['CORRECTIVE', Validators.required],
    serviceType: [null as string | null],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    workshop: [''],
    scheduledDate: [new Date() as Date | null]
  });

  private get id(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.http.get<Incident>(`/api/v1/incidents/${this.id}`).subscribe({
      next: i => { this.inc.set(i); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  tripLink(i: Incident): (string | number)[] {
    return this.isDriver ? ['/my-trips', i.tripId!] : ['/trips', i.tripId!];
  }

  review(i: Incident) {
    this.dialogs.prompt({
      title: `Review ${i.incidentNumber}`,
      label: 'Review notes',
      type: 'textarea',
      hint: 'Optional: first findings, who you contacted, next steps',
      confirmText: 'Start review'
    }).pipe(filter(notes => notes != null)).subscribe(notes => {
      const params: Record<string, string> = notes ? { notes: String(notes) } : {};
      this.run(this.http.put<Incident>(`/api/v1/incidents/${i.id}/review`, {}, { params }), 'Review started');
    });
  }

  openWorkOrder(i: Incident) {
    this.woForm.reset({
      type: i.severity === 'CRITICAL' ? 'EMERGENCY' : 'CORRECTIVE',
      serviceType: null,
      description: `${i.incidentNumber} (${humanize(i.type).toLowerCase()}): ${i.description}`.slice(0, 2000),
      workshop: '',
      scheduledDate: new Date()
    });
    this.woFormOpen.set(true);
  }

  createWorkOrder(i: Incident) {
    if (this.woForm.invalid) {
      this.woForm.markAllAsTouched();
      return;
    }
    const v = this.woForm.getRawValue();
    const body = {
      type: v.type,
      serviceType: v.serviceType,
      description: v.description?.trim(),
      workshop: v.workshop?.trim() || null,
      scheduledDate: v.scheduledDate ? toLocalDate(v.scheduledDate) : null
    };
    this.run(this.http.post<Incident>(`/api/v1/incidents/${i.id}/work-order`, body),
      'Work order created', updated => `${updated.workOrderNumber} created and linked`);
  }

  resolve(i: Incident) {
    this.dialogs.prompt({
      title: `Resolve ${i.incidentNumber}`,
      label: 'Resolution notes',
      type: 'textarea',
      required: true,
      hint: 'What was done and the outcome',
      confirmText: 'Resolve'
    }).pipe(filter(notes => notes != null)).subscribe(notes =>
      this.run(this.http.put<Incident>(`/api/v1/incidents/${i.id}/resolve`, {}, { params: { notes: String(notes) } }),
        'Incident resolved'));
  }

  close(i: Incident) {
    this.dialogs.confirm({
      title: `Close ${i.incidentNumber}?`,
      message: 'Closed incidents are final and can no longer be changed.',
      confirmText: 'Close incident'
    }).pipe(filter(ok => !!ok)).subscribe(() =>
      this.run(this.http.put<Incident>(`/api/v1/incidents/${i.id}/close`, {}), 'Incident closed'));
  }

  private run(request: Observable<Incident>, message: string, messageFn?: (i: Incident) => string) {
    this.busy.set(true);
    request.subscribe({
      next: updated => {
        this.inc.set(updated);
        this.woFormOpen.set(false);
        this.busy.set(false);
        this.notify.success(messageFn ? messageFn(updated) : message);
      },
      error: () => this.busy.set(false)
    });
  }
}
