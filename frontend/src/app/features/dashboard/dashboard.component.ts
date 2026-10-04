import { Component, computed, inject } from '@angular/core';
import { AuthStore } from '../../core/stores/auth.store';
import { DriverDashboardComponent } from './driver-dashboard.component';
import { MaintenanceDashboardComponent } from './maintenance-dashboard.component';
import { ExecutiveDashboardComponent } from './executive-dashboard.component';
import { OperationsDashboardComponent } from './operations-dashboard.component';

/** Picks the dashboard that matches the signed-in user's role. */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DriverDashboardComponent,
    MaintenanceDashboardComponent,
    ExecutiveDashboardComponent,
    OperationsDashboardComponent
  ],
  template: `
    @switch (role()) {
      @case ('DRIVER') { <app-driver-dashboard /> }
      @case ('MAINTENANCE_OFFICER') { <app-maintenance-dashboard /> }
      @case ('EXECUTIVE') { <app-executive-dashboard /> }
      @default { <app-operations-dashboard /> }
    }
  `
})
export class DashboardComponent {
  private readonly authStore = inject(AuthStore);
  readonly role = computed(() => this.authStore.userRole());
}
