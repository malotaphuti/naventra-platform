import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../../core/stores/auth.store';
import { MaintenanceDashboard, firstName, greeting } from './dashboard.models';
import { ServiceScheduleComponent, WorkOrderListComponent } from './maintenance-panels.component';

@Component({
  selector: 'app-maintenance-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatProgressSpinnerModule,
    ServiceScheduleComponent, WorkOrderListComponent],
  template: `
    @if (loading()) {
      <div class="loading-container"><mat-spinner diameter="44"></mat-spinner></div>
    } @else {
      @if (m(); as m) {
      <div class="dash">
        <section class="dash-hero">
          <div class="hero-row">
            <div>
              <span class="eyebrow">Workshop & Maintenance</span>
              <h1>{{ greet }}, {{ name }}</h1>
              <p>
                {{ m.servicesOverdue }} service(s) overdue and {{ m.servicesDueNext30Days }} due in the next 30 days.
                {{ m.vehiclesInMaintenance + m.vehiclesOutOfService }} of {{ m.totalVehicles }} vehicles are off the road.
              </p>
            </div>
            <div class="hero-actions">
              <a class="hero-btn primary" routerLink="/maintenance/new"><mat-icon>add</mat-icon>New work order</a>
              <a class="hero-btn" routerLink="/vehicles"><mat-icon>directions_car</mat-icon>Vehicles</a>
            </div>
          </div>
        </section>

        <div class="stat-grid">
          <div class="stat amber">
            <span class="stat-icon"><mat-icon>build</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">{{ m.vehiclesInMaintenance }}</span>
              <span class="stat-label">In maintenance</span>
            </div>
          </div>
          <div class="stat red">
            <span class="stat-icon"><mat-icon>car_crash</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">{{ m.vehiclesOutOfService }}</span>
              <span class="stat-label">Out of service</span>
            </div>
          </div>
          <div class="stat" [class.red]="m.servicesOverdue > 0" [class.green]="m.servicesOverdue === 0">
            <span class="stat-icon"><mat-icon>event_busy</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">{{ m.servicesOverdue }}</span>
              <span class="stat-label">Services overdue</span>
              <span class="stat-sub">{{ m.servicesDueNext30Days }} due in 30 days</span>
            </div>
          </div>
          <div class="stat violet">
            <span class="stat-icon"><mat-icon>assignment</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">{{ m.workOrdersScheduled + m.workOrdersInProgress + m.workOrdersAwaitingParts }}</span>
              <span class="stat-label">Open work orders</span>
              <span class="stat-sub">{{ m.workOrdersAwaitingParts }} awaiting parts</span>
            </div>
          </div>
          <div class="stat teal">
            <span class="stat-icon"><mat-icon>payments</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">R{{ m.maintenanceCostThisMonth | number:'1.0-0' }}</span>
              <span class="stat-label">Maintenance spend this month</span>
            </div>
          </div>
        </div>

        <div class="panel-grid">
          <section class="panel span-7">
            <div class="panel-head">
              <h2>Service schedule</h2>
              <a routerLink="/vehicles">All vehicles</a>
            </div>
            <app-service-schedule [services]="m.upcomingServices" />
          </section>

          <section class="panel span-5">
            <div class="panel-head"><h2>Work order pipeline</h2></div>
            <div class="pipeline">
              <div><strong>{{ m.workOrdersScheduled }}</strong><span class="pill" data-status="SCHEDULED">Scheduled</span></div>
              <div><strong>{{ m.workOrdersInProgress }}</strong><span class="pill" data-status="IN_PROGRESS">In progress</span></div>
              <div><strong>{{ m.workOrdersAwaitingParts }}</strong><span class="pill" data-status="AWAITING_PARTS">Awaiting parts</span></div>
            </div>
            <div class="panel-head compliance"><h2>Compliance (next 30 days)</h2></div>
            <div class="list">
              <div class="list-row">
                <span class="row-icon"><mat-icon>description</mat-icon></span>
                <div class="row-main"><div class="row-title">Licence discs expiring</div></div>
                <span class="pill" [class.warn]="m.licensesExpiringNext30Days" [class.ok]="!m.licensesExpiringNext30Days">{{ m.licensesExpiringNext30Days }}</span>
              </div>
              <div class="list-row">
                <span class="row-icon"><mat-icon>shield</mat-icon></span>
                <div class="row-main"><div class="row-title">Insurance policies expiring</div></div>
                <span class="pill" [class.warn]="m.insuranceExpiringNext30Days" [class.ok]="!m.insuranceExpiringNext30Days">{{ m.insuranceExpiringNext30Days }}</span>
              </div>
            </div>
          </section>

          <section class="panel span-12">
            <div class="panel-head">
              <h2>Active work orders</h2>
              <a routerLink="/maintenance">View all</a>
            </div>
            <app-work-order-list [orders]="m.activeWorkOrders" />
          </section>
        </div>
      </div>
      }
    }
  `,
  styles: [`
    .pipeline { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    .pipeline > div {
      display: flex; flex-direction: column; align-items: flex-start; gap: 0.4rem;
      padding: 0.9rem; border-radius: 12px; background: #f8fafc; border: 1px solid var(--fo-border);
    }
    .pipeline strong { font-size: 1.5rem; }
    .compliance { margin-top: 1.5rem; }
  `]
})
export class MaintenanceDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);

  readonly loading = signal(true);
  readonly m = signal<MaintenanceDashboard | null>(null);
  readonly greet = greeting();
  readonly name = firstName(this.authStore.user()?.fullName);

  ngOnInit(): void {
    this.http.get<MaintenanceDashboard>('/api/v1/dashboard/maintenance').subscribe({
      next: data => {
        this.m.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
