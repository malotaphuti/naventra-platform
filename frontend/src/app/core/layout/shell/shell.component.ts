import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthStore } from '../../stores/auth.store';
import { AuthService } from '../../services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #sidenav mode="side" [opened]="sidenavOpen()" class="sidenav">
        <div class="sidenav-header">
          <h2>FleetOps</h2>
        </div>
        <mat-nav-list>
          @for (item of visibleNavItems(); track item.route) {
            <a mat-list-item [routerLink]="item.route" routerLinkActive="active">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary" class="toolbar">
          <button mat-icon-button (click)="sidenavOpen.set(!sidenavOpen())"
                  aria-label="Toggle navigation">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="toolbar-title">FleetOps</span>
          <span class="spacer"></span>

          <button mat-icon-button [matMenuTriggerFor]="userMenu" aria-label="User menu">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <div class="user-info">
              <strong>{{ authStore.user()?.fullName }}</strong>
              <small>{{ authStore.user()?.role }}</small>
            </div>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="logout()">
              <mat-icon>exit_to_app</mat-icon>
              <span>Logout</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <main class="content">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container { height: 100vh; }
    .sidenav {
      width: 250px;
      background: #fafafa;
    }
    .sidenav-header {
      padding: 1.5rem;
      text-align: center;
      border-bottom: 1px solid #e0e0e0;
    }
    .sidenav-header h2 {
      margin: 0;
      color: #1a237e;
      font-weight: 700;
    }
    .toolbar { position: sticky; top: 0; z-index: 100; }
    .toolbar-title { margin-left: 8px; font-weight: 500; }
    .spacer { flex: 1; }
    .content { padding: 1.5rem; }
    .active { background: rgba(26, 35, 126, 0.08); }
    .user-info {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
    }
    .user-info small { color: #666; }
  `]
})
export class ShellComponent {
  readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  readonly sidenavOpen = signal(true);

  private readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Vehicles', icon: 'directions_car', route: '/vehicles' },
    { label: 'Drivers', icon: 'people', route: '/drivers' },
    { label: 'Trips', icon: 'route', route: '/trips' },
    { label: 'Fuel', icon: 'local_gas_station', route: '/fuel' },
    { label: 'Maintenance', icon: 'build', route: '/maintenance' },
    { label: 'Incidents', icon: 'warning', route: '/incidents' },
    { label: 'GPS Tracking', icon: 'gps_fixed', route: '/tracking' },
    { label: 'Reports', icon: 'assessment', route: '/reports', roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'EXECUTIVE'] },
    { label: 'Administration', icon: 'admin_panel_settings', route: '/admin', roles: ['SYSTEM_ADMIN'] }
  ];

  readonly visibleNavItems = signal<NavItem[]>(this.getVisibleItems());

  private getVisibleItems(): NavItem[] {
    return this.navItems.filter(item => {
      if (!item.roles) return true;
      return this.authStore.hasAnyRole(item.roles);
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
