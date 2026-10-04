import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ServiceDue, WorkOrderSummary, humanize } from './dashboard.models';

/** Vehicles whose next service is overdue or due within 30 days. Shared by maintenance and operations dashboards. */
@Component({
  selector: 'app-service-schedule',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (services.length) {
      <div class="list">
        @for (s of services; track s.vehicleId) {
          <div class="list-row">
            <span class="row-icon"><mat-icon>build_circle</mat-icon></span>
            <div class="row-main">
              <div class="row-title">{{ s.registrationNumber }} · {{ s.make }} {{ s.model }}</div>
              <div class="row-sub">Service {{ s.nextServiceDate | date:'d MMM y' }} · {{ label(s.status) }}</div>
            </div>
            <span class="pill" [class.danger]="s.daysUntilDue < 0" [class.warn]="s.daysUntilDue >= 0 && s.daysUntilDue <= 7">
              {{ s.daysUntilDue < 0 ? (-s.daysUntilDue) + ' days overdue' : s.daysUntilDue === 0 ? 'Due today' : 'In ' + s.daysUntilDue + ' days' }}
            </span>
          </div>
        }
      </div>
    } @else {
      <div class="empty"><mat-icon>event_available</mat-icon>No services due in the next 30 days.</div>
    }
  `
})
export class ServiceScheduleComponent {
  @Input({ required: true }) services: ServiceDue[] = [];
  readonly label = humanize;
}

@Component({
  selector: 'app-work-order-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (orders.length) {
      <div class="list">
        @for (w of orders; track w.id) {
          <div class="list-row">
            <span class="row-icon"><mat-icon>assignment</mat-icon></span>
            <div class="row-main">
              <div class="row-title">{{ w.workOrderNumber }} · {{ w.vehicleRegistration }}</div>
              <div class="row-sub">{{ label(w.type) }} · {{ w.description }}</div>
            </div>
            <div class="row-end">
              <span class="pill" [attr.data-status]="w.status">{{ label(w.status) }}</span>
              <div>{{ w.scheduledDate | date:'d MMM' }}</div>
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="empty"><mat-icon>task_alt</mat-icon>No open work orders.</div>
    }
  `
})
export class WorkOrderListComponent {
  @Input({ required: true }) orders: WorkOrderSummary[] = [];
  readonly label = humanize;
}
