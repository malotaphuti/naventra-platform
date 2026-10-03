import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../../core/stores/auth.store';
import { FleetOverview, MaintenanceDashboard, firstName, greeting } from './dashboard.models';
import { FleetStatusComponent } from './fleet-status.component';
import { ServiceScheduleComponent, WorkOrderListComponent } from './maintenance-panels.component';

interface QuickAction { label: string; hint: string; icon: string; route: string; }

/** Day-to-day fleet control dashboard for fleet managers and system administrators. */
@Component({
  selector: 'app-operations-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatProgressSpinnerModule,
    FleetStatusComponent, ServiceScheduleComponent, WorkOrderListComponent],
  template: `
    @if (loading()) {
      <div class="loading-container"><mat-spinner diameter="44"></mat-spinner></div>
    } @else {
      @if (o(); as o) {
      <div class="dash">
        <section class="dash-hero">
          <div class="hero-row">
            <div>
              <span class="eyebrow">{{ isAdmin() ? 'System Administration' : 'Fleet Operations' }}</span>
              <h1>{{ greet }}, {{ name }}</h1>
              <p>
                {{ o.vehiclesAvailable }} of {{ o.totalVehicles }} vehicles are ready to dispatch,
                {{ o.tripsInProgress }} trip(s) in progress and {{ o.openIncidents }} open incident(s).
              </p>
            </div>
            <div class="hero-actions">
              @if (isAdmin()) {
                <a class="hero-btn primary" routerLink="/admin"><mat-icon>group_add</mat-icon>Manage users</a>
              } @else {
                <a class="hero-btn primary" routerLink="/trips/new"><mat-icon>add_road</mat-icon>Plan a trip</a>
              }
              <a class="hero-btn" routerLink="/vehicles/new"><mat-icon>add</mat-icon>Add vehicle</a>
            </div>
          </div>
        </section>

        <div class="stat-grid">
          <div class="stat blue">
            <span class="stat-icon"><mat-icon>directions_car</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">{{ o.totalVehicles }}</span>
              <span class="stat-label">Total vehicles</span>
              <span class="stat-sub">{{ o.vehiclesAvailable }} available</span>
            </div>
          </div>
          <div class="stat green">
            <span class="stat-icon"><mat-icon>badge</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">{{ o.activeDrivers }}<small class="of"> / {{ o.totalDrivers }}</small></span>
              <span class="stat-label">Active drivers</span>
            </div>
          </div>
          <div class="stat violet">
            <span class="stat-icon"><mat-icon>route</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">{{ o.tripsToday }}</span>
              <span class="stat-label">Trips today</span>
              <span class="stat-sub">{{ o.tripsInProgress }} in progress</span>
            </div>
          </div>
          <div class="stat" [class.amber]="o.openIncidents > 0" [class.green]="o.openIncidents === 0">
            <span class="stat-icon"><mat-icon>report</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">{{ o.openIncidents }}</span>
              <span class="stat-label">Open incidents</span>
            </div>
          </div>
          <div class="stat red">
            <span class="stat-icon"><mat-icon>local_gas_station</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">R{{ o.fuelCostThisMonth | number:'1.0-0' }}</span>
              <span class="stat-label">Fuel this month</span>
            </div>
          </div>
          <div class="stat teal">
            <span class="stat-icon"><mat-icon>straighten</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">{{ o.totalDistanceThisMonth | number }} km</span>
              <span class="stat-label">Distance this month</span>
            </div>
          </div>
        </div>

        <div class="panel-grid">
          <section class="panel span-7">
            <div class="panel-head">
              <h2>Fleet status</h2>
              <a routerLink="/vehicles">Manage fleet</a>
            </div>
            <app-fleet-status [overview]="o" />
          </section>

          <section class="panel span-5">
            <div class="panel-head"><h2>Quick actions</h2></div>
            <div class="actions">
              @for (a of actions(); track a.route) {
                <a class="action" [routerLink]="a.route"><mat-icon>{{ a.icon }}</mat-icon>{{ a.label }}<small>{{ a.hint }}</small></a>
              }
            </div>
          </section>

          @if (m(); as m) {
            <section class="panel span-6">
              <div class="panel-head">
                <h2>Service schedule</h2>
                <a routerLink="/maintenance">Maintenance</a>
              </div>
              <app-service-schedule [services]="m.upcomingServices" />
            </section>
            <section class="panel span-6">
              <div class="panel-head">
                <h2>Open work orders</h2>
                <a routerLink="/maintenance">View all</a>
              </div>
              <app-work-order-list [orders]="m.activeWorkOrders" />
            </section>
          }
        </div>
      </div>
      }
    }
  `,
  styles: [`.of { font-size: 0.95rem; color: var(--fo-muted); font-weight: 600; }`]
})
export class OperationsDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);

  readonly loading = signal(true);
  readonly o = signal<FleetOverview | null>(null);
  readonly m = signal<MaintenanceDashboard | null>(null);
  readonly greet = greeting();
  readonly name = firstName(this.authStore.user()?.fullName);
  readonly isAdmin = computed(() => this.authStore.userRole() === 'SYSTEM_ADMIN');

  readonly actions = computed<QuickAction[]>(() => this.isAdmin()
    ? [
        { label: 'Users', hint: 'Accounts & roles', icon: 'manage_accounts', route: '/admin' },
        { label: 'Audit log', hint: 'Who changed what', icon: 'history', route: '/admin/audit' },
        { label: 'Add driver', hint: 'Onboard a driver', icon: 'person_add', route: '/drivers/new' },
        { label: 'Reports', hint: 'Fleet analytics', icon: 'insights', route: '/reports' }
      ]
    : [
        { label: 'Plan trip', hint: 'Allocate vehicle', icon: 'add_road', route: '/trips/new' },
        { label: 'Add driver', hint: 'Onboard a driver', icon: 'person_add', route: '/drivers/new' },
        { label: 'Work order', hint: 'Book a service', icon: 'build', route: '/maintenance/new' },
        { label: 'Live tracking', hint: 'Where is my fleet', icon: 'my_location', route: '/tracking' }
      ]);

  ngOnInit(): void {
    forkJoin({
      overview: this.http.get<FleetOverview>('/api/v1/dashboard/overview'),
      maintenance: this.http.get<MaintenanceDashboard>('/api/v1/dashboard/maintenance').pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ overview, maintenance }) => {
        this.o.set(overview);
        this.m.set(maintenance);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
