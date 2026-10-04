import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DriverDashboard, daysUntil, expiryTone, firstName, greeting, humanize } from './dashboard.models';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    @if (loading()) {
      <div class="loading-container"><mat-spinner diameter="44"></mat-spinner></div>
    } @else if (error()) {
      <div class="panel"><div class="empty"><mat-icon>person_off</mat-icon>{{ error() }}</div></div>
    } @else {
      @if (d(); as d) {
      <div class="dash">
        <section class="dash-hero">
          <div class="hero-row">
            <div>
              <span class="eyebrow">Driver · {{ d.employeeNumber }}</span>
              <h1>{{ greet }}, {{ name(d.fullName) }}</h1>
              <p>
                @if (d.activeTrip) {
                  You have an active trip to <strong>{{ d.activeTrip.destination }}</strong>. Drive safe.
                } @else {
                  No active trip right now. Your vehicle and compliance status are below.
                }
              </p>
            </div>
            <div class="hero-actions">
              <a class="hero-btn primary" routerLink="/fuel/new"><mat-icon>local_gas_station</mat-icon>Log fuel</a>
              <a class="hero-btn" routerLink="/incidents/new"><mat-icon>report</mat-icon>Report incident</a>
            </div>
          </div>
        </section>

        <div class="stat-grid">
          <div class="stat blue">
            <span class="stat-icon"><mat-icon>route</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">{{ d.tripsThisMonth }}</span>
              <span class="stat-label">Trips this month</span>
              <span class="stat-sub">{{ d.completedTripsThisMonth }} completed</span>
            </div>
          </div>
          <div class="stat teal">
            <span class="stat-icon"><mat-icon>straighten</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">{{ d.distanceThisMonthKm | number }} km</span>
              <span class="stat-label">Distance driven</span>
            </div>
          </div>
          <div class="stat red">
            <span class="stat-icon"><mat-icon>local_gas_station</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">R{{ d.fuelSpendThisMonth | number:'1.0-0' }}</span>
              <span class="stat-label">Fuel logged this month</span>
            </div>
          </div>
          <div class="stat" [class.amber]="d.openIncidents > 0" [class.green]="d.openIncidents === 0">
            <span class="stat-icon"><mat-icon>{{ d.openIncidents ? 'report' : 'verified' }}</mat-icon></span>
            <div class="stat-body">
              <span class="stat-value">{{ d.openIncidents }}</span>
              <span class="stat-label">Open incidents</span>
              <span class="stat-sub">{{ d.pendingTripRequests }} trip request(s) pending</span>
            </div>
          </div>
        </div>

        <div class="panel-grid">
          <section class="panel span-7">
            <div class="panel-head">
              <h2>My vehicle</h2>
              <a routerLink="/my-vehicle">Details</a>
            </div>
            @if (d.assignedVehicle; as v) {
              <div class="vehicle">
                <div class="plate">{{ v.registrationNumber }}</div>
                <div class="vehicle-name">
                  <strong>{{ v.make }} {{ v.model }}</strong>
                  <span>{{ v.year }} · {{ v.color || 'Colour n/a' }} · {{ v.fuelType || 'Fuel n/a' }}</span>
                </div>
                <span class="pill" [attr.data-status]="v.status">{{ label(v.status) }}</span>
              </div>
              <div class="facts">
                <div class="fact">
                  <span class="fact-label">Odometer</span>
                  <span class="fact-value">{{ v.currentOdometerKm | number }} km</span>
                </div>
                <div class="fact">
                  <span class="fact-label">Next service</span>
                  <span class="fact-value">{{ (v.nextServiceDate | date:'d MMM y') || 'Not set' }}</span>
                </div>
                <div class="fact">
                  <span class="fact-label">Licence disc</span>
                  <span class="fact-value"><span class="pill" [ngClass]="tone(v.licenseExpiryDate)">{{ (v.licenseExpiryDate | date:'d MMM y') || 'Not set' }}</span></span>
                </div>
                <div class="fact">
                  <span class="fact-label">Insurance</span>
                  <span class="fact-value"><span class="pill" [ngClass]="tone(v.insuranceExpiryDate)">{{ (v.insuranceExpiryDate | date:'d MMM y') || 'Not set' }}</span></span>
                </div>
              </div>
            } @else {
              <div class="empty">
                <mat-icon>no_crash</mat-icon>
                No vehicle is assigned to you yet. Contact your fleet manager.
              </div>
            }
          </section>

          <section class="panel span-5">
            <div class="panel-head"><h2>My compliance</h2></div>
            <div class="list">
              <div class="list-row">
                <span class="row-icon"><mat-icon>badge</mat-icon></span>
                <div class="row-main">
                  <div class="row-title">Driver's licence {{ d.licenseClass ? '(' + d.licenseClass + ')' : '' }}</div>
                  <div class="row-sub">Expires {{ d.licenseExpiryDate | date:'d MMM y' }}</div>
                </div>
                <span class="pill" [ngClass]="tone(d.licenseExpiryDate)">{{ remaining(d.licenseExpiryDate) }}</span>
              </div>
              <div class="list-row">
                <span class="row-icon"><mat-icon>medical_services</mat-icon></span>
                <div class="row-main">
                  <div class="row-title">Medical certificate</div>
                  <div class="row-sub">{{ d.medicalCertificateExpiry ? 'Expires ' + (d.medicalCertificateExpiry | date:'d MMM y') : 'Not on file' }}</div>
                </div>
                <span class="pill" [ngClass]="tone(d.medicalCertificateExpiry)">{{ remaining(d.medicalCertificateExpiry) }}</span>
              </div>
              <div class="list-row">
                <span class="row-icon"><mat-icon>how_to_reg</mat-icon></span>
                <div class="row-main">
                  <div class="row-title">Driver status</div>
                  <div class="row-sub">Employee {{ d.employeeNumber }}</div>
                </div>
                <span class="pill" [attr.data-status]="d.status">{{ label(d.status) }}</span>
              </div>
            </div>
          </section>

          <section class="panel span-7">
            <div class="panel-head">
              <h2>Recent trips</h2>
              <a routerLink="/my-trips">View all</a>
            </div>
            @if (d.recentTrips.length) {
              <div class="list">
                @for (t of d.recentTrips; track t.id) {
                  <a class="list-row" [routerLink]="['/my-trips', t.id]">
                    <span class="row-icon"><mat-icon>route</mat-icon></span>
                    <div class="row-main">
                      <div class="row-title">{{ t.origin }} → {{ t.destination }}</div>
                      <div class="row-sub">{{ t.tripNumber }} · {{ t.vehicleRegistration }}</div>
                    </div>
                    <div class="row-end">
                      <span class="pill" [attr.data-status]="t.status">{{ label(t.status) }}</span>
                      <div>{{ t.distanceKm ? (t.distanceKm | number) + ' km' : '' }}</div>
                    </div>
                  </a>
                }
              </div>
            } @else {
              <div class="empty"><mat-icon>map</mat-icon>You haven't been allocated any trips yet.</div>
            }
          </section>

          <section class="panel span-5">
            <div class="panel-head"><h2>Quick actions</h2></div>
            <div class="actions">
              <a class="action" routerLink="/my-trips"><mat-icon>route</mat-icon>My trips<small>History & status</small></a>
              <a class="action" routerLink="/my-vehicle"><mat-icon>directions_car</mat-icon>My vehicle<small>Details & dates</small></a>
              <a class="action" routerLink="/fuel/new"><mat-icon>local_gas_station</mat-icon>Log fuel<small>Add a slip</small></a>
              <a class="action" routerLink="/incidents/new"><mat-icon>car_crash</mat-icon>Report incident<small>Accident or fault</small></a>
            </div>
          </section>
        </div>
      </div>
      }
    }
  `,
  styles: [`
    .vehicle { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
    .plate {
      padding: 0.45rem 0.9rem; border-radius: 8px; font-weight: 800; letter-spacing: 0.08em;
      font-family: 'Segoe UI', Roboto, monospace; background: #fde047; color: #111827;
      border: 2px solid #111827; box-shadow: inset 0 0 0 2px #fde047;
    }
    .vehicle-name { display: flex; flex-direction: column; flex: 1; min-width: 160px; }
    .vehicle-name strong { font-size: 1.1rem; }
    .vehicle-name span { color: var(--fo-muted); font-size: 0.85rem; }
  `]
})
export class DriverDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly d = signal<DriverDashboard | null>(null);
  readonly greet = greeting();
  readonly name = firstName;
  readonly label = humanize;
  readonly tone = expiryTone;

  ngOnInit(): void {
    this.http.get<DriverDashboard>('/api/v1/dashboard/driver').subscribe({
      next: data => {
        this.d.set(data);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.error?.message || 'Could not load your dashboard.');
        this.loading.set(false);
      }
    });
  }

  remaining(date: string | null): string {
    const days = daysUntil(date);
    if (days === null) return 'n/a';
    if (days < 0) return 'Expired';
    if (days === 0) return 'Today';
    return days > 60 ? `${Math.round(days / 30)} months` : `${days} days`;
  }
}
