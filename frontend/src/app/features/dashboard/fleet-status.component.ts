import { Component, Input, computed, signal } from '@angular/core';
import { FleetOverview, fleetSegments } from './dashboard.models';

/** Stacked bar + legend showing how the fleet is split across vehicle statuses. */
@Component({
  selector: 'app-fleet-status',
  standalone: true,
  template: `
    <div class="status-bar" role="img" [attr.aria-label]="'Fleet status across ' + total() + ' vehicles'">
      @for (s of segments(); track s.label) {
        @if (s.value) { <span [style.width.%]="s.percent" [style.background]="s.color" [attr.title]="s.label + ': ' + s.value"></span> }
      }
    </div>
    <div class="legend">
      @for (s of segments(); track s.label) {
        <div class="legend-item">
          <span class="dot" [style.background]="s.color"></span>{{ s.label }}<strong>{{ s.value }}</strong>
        </div>
      }
    </div>
  `
})
export class FleetStatusComponent {
  private readonly data = signal<FleetOverview | null>(null);

  @Input({ required: true }) set overview(value: FleetOverview) {
    this.data.set(value);
  }

  readonly segments = computed(() => (this.data() ? fleetSegments(this.data()!) : []));
  readonly total = computed(() => this.data()?.totalVehicles ?? 0);
}
