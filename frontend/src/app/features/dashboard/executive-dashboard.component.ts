import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../../core/stores/auth.store';
import { FleetOverview, firstName, greeting } from './dashboard.models';
import { FleetStatusComponent } from './fleet-status.component';

interface Highlight { icon: string; tone: 'ok' | 'warn' | 'danger'; text: string; }

/** Strategic, cost-focused summary for executives. */
@Component({
  selector: 'app-executive-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatProgressSpinnerModule, FleetStatusComponent],
  template: `
    @if (loading()) {
      <div class="loading-container"><mat-spinner diameter="44"></mat-spinner></div>
    } @else {
      @if (o(); as o) {
      <div class="dash">
        <section class="dash-hero">
          <div class="hero-row">
            <div>
              <span class="eyebrow">Executive Summary · {{ month | date:'MMMM y' }}</span>
              <h1>{{ greet }}, {{ name }}</h1>
              <p>Fleet utilisation is at {{ utilisation() | number:'1.0-0' }}% with an operating cost of
                R{{ operatingCost() | number:'1.0-0' }} so far this month.</p>
            </div>
            <div class="hero-actions">
              <a class="hero-btn primary" routerLink="/reports"><mat-icon>insights</mat-icon>Open reports</a>
              <a class="hero-btn" routerLink="/tracking"><mat-icon>my_location</mat-icon>Live map</a>
            </div>
          </div>
        </section>

        <div class="stat-grid">
          <div class="stat blue">
            <span class="stat-icon"><mat-icon>speed</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">{{ utilisation() | number:'1.0-0' }}%</span>
              <span class="stat-label">Fleet utilisation</span>
              <span class="stat-sub">Vehicles on trip or reserved</span>
            </div>
          </div>
          <div class="stat green">
            <span class="stat-icon"><mat-icon>verified</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">{{ availability() | number:'1.0-0' }}%</span>
              <span class="stat-label">Fleet availability</span>
              <span class="stat-sub">Not in maintenance or out of service</span>
            </div>
          </div>
          <div class="stat teal">
            <span class="stat-icon"><mat-icon>account_balance_wallet</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">R{{ operatingCost() | number:'1.0-0' }}</span>
              <span class="stat-label">Operating cost (MTD)</span>
              <span class="stat-sub">Fuel + maintenance</span>
            </div>
          </div>
          <div class="stat violet">
            <span class="stat-icon"><mat-icon>price_check</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">{{ costPerKm() === null ? '–' : 'R' + (costPerKm() | number:'1.2-2') }}</span>
              <span class="stat-label">Cost per km</span>
              <span class="stat-sub">{{ o.totalDistanceThisMonth | number }} km driven</span>
            </div>
          </div>
        </div>

        <div class="panel-grid">
          <section class="panel span-7">
            <div class="panel-head"><h2>Fleet status</h2><a routerLink="/vehicles">Fleet register</a></div>
            <app-fleet-status [overview]="o" />
          </section>

          <section class="panel span-5">
            <div class="panel-head"><h2>Cost breakdown (MTD)</h2></div>
            @for (c of costs(); track c.label) {
              <div class="cost">
                <div class="cost-head"><span>{{ c.label }}</span><strong>R{{ c.value | number:'1.0-0' }}</strong></div>
                <div class="status-bar"><span [style.width.%]="c.percent" [style.background]="c.color"></span></div>
              </div>
            }
            @if (!operatingCost()) {
              <div class="empty"><mat-icon>receipt_long</mat-icon>No costs recorded yet this month.</div>
            }
          </section>

          <section class="panel span-12">
            <div class="panel-head"><h2>Highlights</h2></div>
            <div class="highlights">
              @for (h of highlights(); track h.text) {
                <div class="highlight"><span class="pill" [ngClass]="h.tone"><mat-icon>{{ h.icon }}</mat-icon></span>{{ h.text }}</div>
              }
            </div>
          </section>
        </div>
      </div>
      }
    }
  `,
  styles: [`
    .cost { margin-bottom: 1.1rem; }
    .cost-head { display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.4rem; }
    .cost-head span { color: var(--fo-muted); }
    .highlights { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0.75rem; }
    .highlight {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; font-size: 0.875rem;
      border-radius: 12px; background: #f8fafc; border: 1px solid var(--fo-border);
    }
    .highlight .pill { padding: 0.35rem; }
    .highlight mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `]
})
export class ExecutiveDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);

  readonly loading = signal(true);
  readonly o = signal<FleetOverview | null>(null);
  readonly greet = greeting();
  readonly name = firstName(this.authStore.user()?.fullName);
  readonly month = new Date();

  private readonly total = computed(() => this.o()?.totalVehicles || 0);

  readonly utilisation = computed(() => {
    const o = this.o();
    if (!o || !this.total()) return 0;
    const reservedOrOther = o.totalVehicles - o.vehiclesAvailable - o.vehiclesOnTrip
      - o.vehiclesInMaintenance - o.vehiclesOutOfService;
    return ((o.vehiclesOnTrip + Math.max(0, reservedOrOther)) / this.total()) * 100;
  });

  readonly availability = computed(() => {
    const o = this.o();
    if (!o || !this.total()) return 0;
    return ((o.totalVehicles - o.vehiclesInMaintenance - o.vehiclesOutOfService) / this.total()) * 100;
  });

  readonly operatingCost = computed(() =>
    Number(this.o()?.fuelCostThisMonth ?? 0) + Number(this.o()?.maintenanceCostThisMonth ?? 0));

  readonly costPerKm = computed(() => {
    const km = this.o()?.totalDistanceThisMonth ?? 0;
    return km > 0 ? this.operatingCost() / km : null;
  });

  readonly costs = computed(() => {
    const fuel = Number(this.o()?.fuelCostThisMonth ?? 0);
    const maintenance = Number(this.o()?.maintenanceCostThisMonth ?? 0);
    const total = fuel + maintenance || 1;
    return [
      { label: 'Fuel', value: fuel, percent: (fuel / total) * 100, color: '#dc2626' },
      { label: 'Maintenance', value: maintenance, percent: (maintenance / total) * 100, color: '#d97706' }
    ];
  });

  readonly highlights = computed<Highlight[]>(() => {
    const o = this.o();
    if (!o) return [];
    const list: Highlight[] = [];
    list.push(o.vehiclesOutOfService
      ? { icon: 'car_crash', tone: 'danger', text: `${o.vehiclesOutOfService} vehicle(s) are out of service.` }
      : { icon: 'check_circle', tone: 'ok', text: 'No vehicles are out of service.' });
    list.push(o.openIncidents
      ? { icon: 'report', tone: 'warn', text: `${o.openIncidents} incident(s) awaiting resolution.` }
      : { icon: 'shield', tone: 'ok', text: 'No open incidents.' });
    list.push({ icon: 'badge', tone: o.activeDrivers < o.totalDrivers ? 'warn' : 'ok',
      text: `${o.activeDrivers} of ${o.totalDrivers} drivers are active.` });
    list.push({ icon: 'build', tone: o.upcomingMaintenanceCount ? 'warn' : 'ok',
      text: `${o.upcomingMaintenanceCount} maintenance job(s) scheduled.` });
    return list;
  });

  ngOnInit(): void {
    this.http.get<FleetOverview>('/api/v1/dashboard/overview').subscribe({
      next: data => {
        this.o.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
