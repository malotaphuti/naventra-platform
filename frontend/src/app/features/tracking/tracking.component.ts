import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription, catchError, of, switchMap, timer } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as L from 'leaflet';
import { humanize } from '../dashboard/dashboard.models';
import { LivePosition, TrackingFilter, TripTrack, escapeHtml, statusColor } from './tracking.models';

const REFRESH_MS = 10_000;
const DEPOT: L.LatLngTuple = [-26.2041, 28.0473];

/** Live fleet map backed by /gps/live, refreshed every 10 s. */
@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonToggleModule, MatProgressSpinnerModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Live tracking</h1>
        <p>
          {{ movingCount() }} moving · {{ positions().length - movingCount() }} parked
          @if (updatedAt(); as u) { · updated {{ u | date:'HH:mm:ss' }} }
        </p>
      </div>
      <div class="head-actions">
        <mat-button-toggle-group [value]="filter()" (change)="filter.set($event.value)" aria-label="Filter vehicles">
          <mat-button-toggle value="ALL">All</mat-button-toggle>
          <mat-button-toggle value="MOVING">Moving</mat-button-toggle>
          <mat-button-toggle value="PARKED">Parked</mat-button-toggle>
        </mat-button-toggle-group>
      </div>
    </div>

    <div class="track-layout">
      <div class="map-wrap">
        <div #mapEl class="map"></div>
        @if (loading()) {
          <div class="map-loading"><mat-spinner diameter="40"></mat-spinner></div>
        }
      </div>

      <section class="panel side">
        <div class="panel-head"><h2>Vehicles ({{ visible().length }})</h2></div>
        <div class="vlist">
          @for (p of visible(); track p.vehicleId) {
            <button type="button" class="vrow" [class.sel]="p.vehicleId === selectedId()" (click)="select(p)">
              <span class="dot" [style.background]="color(p.status)"></span>
              <span class="vmain">
                <span class="vtop">
                  <strong>{{ p.registrationNumber }}</strong>
                  <span class="pill" [attr.data-status]="p.status">{{ humanize(p.status) }}</span>
                </span>
                <span class="vsub">{{ p.make }} {{ p.model }} · {{ p.driverName || 'No driver' }}</span>
                @if (p.moving) {
                  <span class="vsub">{{ p.origin }} → {{ p.destination }} · {{ p.speedKmh | number:'1.0-0' }} km/h</span>
                  <span class="bar"><span [style.width.%]="p.progressPercent ?? 0"></span></span>
                }
              </span>
            </button>
          } @empty {
            <div class="empty"><mat-icon>location_off</mat-icon><span>No vehicles to show</span></div>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .track-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 1rem; }
    .map-wrap { position: relative; }
    .map, .side { height: calc(100vh - 220px); min-height: 480px; }
    .map { border-radius: var(--fo-radius); border: 1px solid var(--fo-border); box-shadow: var(--fo-shadow); z-index: 0; }
    .map-loading { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(255,255,255,.6); z-index: 500; border-radius: var(--fo-radius); }
    .side { display: flex; flex-direction: column; overflow: hidden; }
    .vlist { overflow-y: auto; flex: 1; margin: 0 -0.5rem; }
    .vrow { display: flex; gap: 0.7rem; width: 100%; text-align: left; border: 0; background: none; padding: 0.65rem 0.5rem; border-radius: 10px; cursor: pointer; font: inherit; color: inherit; }
    .vrow:hover { background: #f8fafc; }
    .vrow.sel { background: #eff6ff; box-shadow: inset 3px 0 0 var(--fo-blue); }
    .dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; flex: none; }
    .vmain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .vtop { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
    .vsub { font-size: 0.78rem; color: var(--fo-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar { height: 5px; border-radius: 999px; background: #e2e8f0; overflow: hidden; margin-top: 3px; }
    .bar span { display: block; height: 100%; background: var(--fo-blue); }
    @media (max-width: 960px) {
      .track-layout { grid-template-columns: 1fr; }
      .side { height: auto; min-height: 0; max-height: 420px; }
    }
  `]
})
export class TrackingComponent implements AfterViewInit, OnDestroy {
  private readonly http = inject(HttpClient);
  @ViewChild('mapEl', { static: true }) private mapEl!: ElementRef<HTMLDivElement>;

  readonly positions = signal<LivePosition[]>([]);
  readonly loading = signal(true);
  readonly updatedAt = signal<Date | null>(null);
  readonly filter = signal<TrackingFilter>('ALL');
  readonly selectedId = signal<number | null>(null);
  readonly movingCount = computed(() => this.positions().filter(p => p.moving).length);
  readonly visible = computed(() => {
    const f = this.filter();
    return this.positions()
      .filter(p => f === 'ALL' || (f === 'MOVING') === p.moving)
      .sort((a, b) => Number(b.moving) - Number(a.moving) || a.registrationNumber.localeCompare(b.registrationNumber));
  });
  readonly humanize = humanize;
  readonly color = statusColor;

  private map?: L.Map;
  private readonly markers = new Map<number, L.CircleMarker>();
  private readonly trackLayer = L.layerGroup();
  private fitted = false;
  private sub?: Subscription;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl.nativeElement, { center: DEPOT, zoom: 10 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);
    this.trackLayer.addTo(this.map);
    setTimeout(() => this.map?.invalidateSize());

    this.sub = timer(0, REFRESH_MS).pipe(
      switchMap(() => this.http.get<LivePosition[]>('/api/v1/gps/live').pipe(catchError(() => of(null))))
    ).subscribe(list => {
      this.loading.set(false);
      if (!list) return;
      this.positions.set(list);
      this.updatedAt.set(new Date());
      this.renderMarkers(list);
      const sel = list.find(p => p.vehicleId === this.selectedId());
      if (sel?.tripId) this.loadTrack(sel.tripId, false);
      else if (sel) this.clearTrack();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.map?.remove();
  }

  select(p: LivePosition): void {
    this.selectedId.set(p.vehicleId);
    this.restyleMarkers();
    const marker = this.markers.get(p.vehicleId);
    this.map?.setView([p.latitude, p.longitude], Math.max(this.map.getZoom(), 12));
    marker?.openPopup();
    if (p.tripId) {
      this.loadTrack(p.tripId, true);
    } else {
      this.clearTrack();
    }
  }

  private renderMarkers(list: LivePosition[]): void {
    if (!this.map) return;
    const seen = new Set<number>();
    for (const p of list) {
      seen.add(p.vehicleId);
      let marker = this.markers.get(p.vehicleId);
      if (!marker) {
        marker = L.circleMarker([p.latitude, p.longitude]).addTo(this.map);
        marker.bindPopup('');
        marker.on('click', () => {
          const current = this.positions().find(x => x.vehicleId === p.vehicleId);
          if (current) this.select(current);
        });
        this.markers.set(p.vehicleId, marker);
      } else {
        marker.setLatLng([p.latitude, p.longitude]);
      }
      marker.setPopupContent(this.popupHtml(p));
      marker.setStyle(this.markerStyle(p));
    }
    for (const [id, marker] of this.markers) {
      if (!seen.has(id)) {
        marker.remove();
        this.markers.delete(id);
      }
    }
    if (!this.fitted && list.length) {
      this.fitted = true;
      this.map.fitBounds(L.latLngBounds(list.map(p => [p.latitude, p.longitude] as L.LatLngTuple)),
        { padding: [40, 40], maxZoom: 12 });
    }
  }

  private restyleMarkers(): void {
    for (const p of this.positions()) {
      this.markers.get(p.vehicleId)?.setStyle(this.markerStyle(p));
    }
    this.markers.get(this.selectedId() ?? -1)?.bringToFront();
  }

  private markerStyle(p: LivePosition): L.CircleMarkerOptions {
    const selected = p.vehicleId === this.selectedId();
    return {
      radius: selected ? 11 : p.moving ? 9 : 7,
      color: selected ? '#0f172a' : '#ffffff',
      weight: selected ? 3 : 2,
      fillColor: statusColor(p.status),
      fillOpacity: 0.95
    };
  }

  private popupHtml(p: LivePosition): string {
    const rows = [
      `<strong>${escapeHtml(p.registrationNumber)}</strong> · ${escapeHtml(p.make)} ${escapeHtml(p.model)}`,
      `Status: ${escapeHtml(humanize(p.status))}`,
      `Driver: ${escapeHtml(p.driverName || '—')}`
    ];
    if (p.tripNumber) {
      rows.push(`Trip: ${escapeHtml(p.tripNumber)} (${p.progressPercent ?? 0}%)`);
      rows.push(`${escapeHtml(p.origin)} → ${escapeHtml(p.destination)}`);
      rows.push(`Speed: ${Math.round(p.speedKmh ?? 0)} km/h`);
    }
    if (p.recordedAt) {
      rows.push(`<small>Updated ${escapeHtml(new Date(p.recordedAt).toLocaleTimeString())}</small>`);
    }
    return rows.join('<br>');
  }

  private loadTrack(tripId: number, fit: boolean): void {
    this.http.get<TripTrack>(`/api/v1/gps/trips/${tripId}/track`).subscribe({
      next: track => {
        if (!this.map || this.positions().find(p => p.vehicleId === this.selectedId())?.tripId !== tripId) return;
        this.trackLayer.clearLayers();
        const o: L.LatLngTuple = [track.origin.latitude, track.origin.longitude];
        const d: L.LatLngTuple = [track.destination.latitude, track.destination.longitude];
        const path = track.points.map(pt => [pt.latitude, pt.longitude] as L.LatLngTuple);
        L.polyline([o, d], { color: '#94a3b8', weight: 2, dashArray: '6 6' }).addTo(this.trackLayer);
        if (path.length) {
          L.polyline([o, ...path], { color: '#2563eb', weight: 4, opacity: 0.85 }).addTo(this.trackLayer);
        }
        L.circleMarker(o, { radius: 6, color: '#fff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 })
          .bindTooltip(`Origin: ${escapeHtml(track.origin.name)}`).addTo(this.trackLayer);
        L.circleMarker(d, { radius: 6, color: '#fff', weight: 2, fillColor: '#dc2626', fillOpacity: 1 })
          .bindTooltip(`Destination: ${escapeHtml(track.destination.name)}`).addTo(this.trackLayer);
        if (fit) {
          this.map.fitBounds(L.latLngBounds([o, d, ...path]), { padding: [50, 50], maxZoom: 13 });
        }
      },
      error: () => this.clearTrack()
    });
  }

  private clearTrack(): void {
    this.trackLayer.clearLayers();
  }
}
