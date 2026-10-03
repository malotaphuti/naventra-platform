import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { AuthStore } from '../../stores/auth.store';
import { AuthService } from '../../services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

export const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: 'System Administrator',
  FLEET_MANAGER: 'Fleet Manager',
  DRIVER: 'Driver',
  MAINTENANCE_OFFICER: 'Maintenance Officer',
  EXECUTIVE: 'Executive'
};

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
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav [mode]="isMobile() ? 'over' : 'side'" [opened]="sidenavOpen()"
                   (closedStart)="sidenavOpen.set(false)" class="sidenav">
        <div class="brand">
          <span class="brand-mark"><mat-icon>local_shipping</mat-icon></span>
          <span class="brand-name">FleetOps</span>
        </div>

        <span class="nav-caption">Menu</span>
        <nav class="nav">
          @for (item of visibleNavItems(); track item.route) {
            <a class="nav-item" [routerLink]="item.route" routerLinkActive="active" (click)="closeOnMobile()">
              <mat-icon>{{ item.icon }}</mat-icon>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="user-card">
          <span class="avatar">{{ initials() }}</span>
          <div class="user-meta">
            <strong>{{ authStore.user()?.fullName }}</strong>
            <small>{{ roleLabel() }}</small>
          </div>
          <button mat-icon-button (click)="logout()" aria-label="Logout" class="logout">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="main">
        <header class="topbar">
          <button mat-icon-button (click)="sidenavOpen.set(!sidenavOpen())" aria-label="Toggle navigation">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="today">{{ today | date:'EEEE, d MMMM y' }}</span>
          <span class="spacer"></span>

          <button class="user-chip" [matMenuTriggerFor]="userMenu" aria-label="User menu">
            <span class="avatar sm">{{ initials() }}</span>
            <span class="chip-text">{{ authStore.user()?.fullName }}</span>
            <mat-icon>expand_more</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu" xPosition="before">
            <div class="menu-user">
              <strong>{{ authStore.user()?.fullName }}</strong>
              <small>{{ authStore.user()?.email }}</small>
              <span class="pill ok">{{ roleLabel() }}</span>
            </div>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="changePassword()">
              <mat-icon>password</mat-icon>
              <span>Change password</span>
            </button>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Sign out</span>
            </button>
          </mat-menu>
        </header>

        <main class="content">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container { height: 100vh; background: var(--fo-bg); }
    .sidenav {
      width: 256px; border: none; color: #cbd5e1;
      background: linear-gradient(180deg, var(--fo-navy) 0%, var(--fo-navy-2) 100%);
    }
    .sidenav ::ng-deep .mat-drawer-inner-container { display: flex; flex-direction: column; padding: 1.25rem 0.9rem; }
    .brand { display: flex; align-items: center; gap: 0.7rem; padding: 0.25rem 0.5rem 1.5rem; }
    .brand-mark {
      display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: #fff;
      background: linear-gradient(135deg, #14b8a6, #22d3ee); box-shadow: 0 6px 18px rgba(34, 211, 238, 0.3);
    }
    .brand-name { color: #fff; font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; }
    .nav-caption {
      padding: 0 0.75rem 0.5rem; font-size: 0.68rem; font-weight: 600;
      letter-spacing: 0.12em; text-transform: uppercase; color: #64748b;
    }
    .nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .nav-item {
      position: relative; display: flex; align-items: center; gap: 0.8rem;
      padding: 0.68rem 0.75rem; border-radius: 10px; color: #94a3b8;
      text-decoration: none; font-size: 0.9rem; font-weight: 500;
      transition: background 0.15s, color 0.15s;
    }
    .nav-item mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .nav-item:hover { background: rgba(148, 163, 184, 0.08); color: #e2e8f0; }
    .nav-item.active { background: rgba(20, 184, 166, 0.14); color: #fff; }
    .nav-item.active mat-icon { color: #2dd4bf; }
    .nav-item.active::before {
      content: ''; position: absolute; left: -0.9rem; top: 22%; bottom: 22%;
      width: 3px; border-radius: 0 3px 3px 0; background: #2dd4bf;
    }
    .user-card {
      display: flex; align-items: center; gap: 0.65rem; padding: 0.75rem;
      border-radius: 12px; background: rgba(148, 163, 184, 0.08); margin-top: 1rem;
    }
    .user-meta { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .user-meta strong { color: #f1f5f9; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-meta small { color: #94a3b8; font-size: 0.72rem; }
    .logout { color: #94a3b8; }
    .avatar {
      display: grid; place-items: center; flex: none; width: 36px; height: 36px; border-radius: 50%;
      font-size: 0.8rem; font-weight: 700; color: #0f172a; background: linear-gradient(135deg, #5eead4, #67e8f9);
    }
    .avatar.sm { width: 30px; height: 30px; font-size: 0.72rem; }
    .topbar {
      position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 0.5rem;
      height: 64px; padding: 0 1.25rem 0 0.5rem;
      background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--fo-border);
    }
    .today { color: var(--fo-muted); font-size: 0.875rem; font-weight: 500; }
    .spacer { flex: 1; }
    .user-chip {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0.5rem 0.25rem 0.25rem;
      border: 1px solid var(--fo-border); border-radius: 999px; background: #fff; cursor: pointer;
      font: inherit; font-size: 0.85rem; font-weight: 600; color: var(--fo-text);
    }
    .user-chip mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--fo-muted); }
    .menu-user { display: flex; flex-direction: column; gap: 0.2rem; padding: 0.75rem 1rem; min-width: 220px; }
    .menu-user small { color: var(--fo-muted); }
    .menu-user .pill { align-self: flex-start; margin-top: 0.4rem; }
    .content { padding: 1.75rem; max-width: 1440px; margin: 0 auto; }
    @media (max-width: 768px) {
      .content { padding: 1rem; }
      .chip-text, .today { display: none; }
    }
  `]
})
export class ShellComponent {
  readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly breakpoints = inject(BreakpointObserver);

  /** Phones: the menu slides over the page and closes after navigating. Desktop: pinned beside the page. */
  readonly isMobile = toSignal(
    this.breakpoints.observe('(max-width: 768px)').pipe(map(state => state.matches)),
    { initialValue: window.innerWidth <= 768 }
  );
  readonly sidenavOpen = signal(window.innerWidth > 768);
  readonly today = new Date();

  constructor() {
    // Re-pin the menu when the window grows to desktop size, hide it when it shrinks to phone size
    effect(() => this.sidenavOpen.set(!this.isMobile()), { allowSignalWrites: true });
  }

  closeOnMobile(): void {
    if (this.isMobile()) {
      this.sidenavOpen.set(false);
    }
  }

  private readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'space_dashboard', route: '/dashboard' },
    { label: 'Vehicles', icon: 'directions_car', route: '/vehicles', roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_OFFICER', 'EXECUTIVE'] },
    { label: 'My Vehicle', icon: 'directions_car', route: '/my-vehicle', roles: ['DRIVER'] },
    { label: 'Drivers', icon: 'badge', route: '/drivers', roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER'] },
    { label: 'Trips', icon: 'route', route: '/trips', roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'EXECUTIVE'] },
    { label: 'My Trips', icon: 'route', route: '/my-trips', roles: ['DRIVER'] },
    { label: 'Fuel', icon: 'local_gas_station', route: '/fuel', roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER'] },
    { label: 'Maintenance', icon: 'build', route: '/maintenance', roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_OFFICER'] },
    { label: 'Incidents', icon: 'report', route: '/incidents', roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER', 'MAINTENANCE_OFFICER'] },
    { label: 'GPS Tracking', icon: 'my_location', route: '/tracking', roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'EXECUTIVE'] },
    { label: 'Reports', icon: 'insights', route: '/reports', roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'EXECUTIVE'] },
    { label: 'Users', icon: 'manage_accounts', route: '/admin/users', roles: ['SYSTEM_ADMIN'] },
    { label: 'Audit Log', icon: 'history', route: '/admin/audit', roles: ['SYSTEM_ADMIN'] }
  ];

  readonly visibleNavItems = computed(() => {
    const role = this.authStore.userRole();
    return this.navItems.filter(item => {
      if (!item.roles) return true;
      return role != null && item.roles.includes(role);
    });
  });

  readonly roleLabel = computed(() => ROLE_LABELS[this.authStore.userRole() ?? ''] ?? '');

  readonly initials = computed(() =>
    (this.authStore.user()?.fullName ?? '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('')
  );

  private readonly dialog = inject(MatDialog);

  changePassword(): void {
    import('../../../features/admin/change-password-dialog.component').then(m =>
      this.dialog.open(m.ChangePasswordDialogComponent, { width: '440px', maxWidth: '95vw' }));
  }

  logout(): void {
    this.authService.logout();
  }
}
