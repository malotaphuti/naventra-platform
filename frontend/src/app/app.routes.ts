import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./core/layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'vehicles',
        loadChildren: () => import('./features/vehicles/vehicles.routes').then(m => m.VEHICLE_ROUTES)
      },
      {
        path: 'drivers',
        loadChildren: () => import('./features/drivers/drivers.routes').then(m => m.DRIVER_ROUTES)
      },
      {
        path: 'trips',
        loadChildren: () => import('./features/trips/trips.routes').then(m => m.TRIP_ROUTES)
      },
      {
        path: 'fuel',
        loadChildren: () => import('./features/fuel/fuel.routes').then(m => m.FUEL_ROUTES)
      },
      {
        path: 'maintenance',
        loadChildren: () => import('./features/maintenance/maintenance.routes').then(m => m.MAINTENANCE_ROUTES)
      },
      {
        path: 'incidents',
        loadChildren: () => import('./features/incidents/incidents.routes').then(m => m.INCIDENT_ROUTES)
      },
      {
        path: 'tracking',
        loadComponent: () => import('./features/tracking/tracking.component').then(m => m.TrackingComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
        canActivate: [roleGuard],
        data: { roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'EXECUTIVE'] }
      },
      {
        path: 'admin',
        loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
        canActivate: [roleGuard],
        data: { roles: ['SYSTEM_ADMIN'] }
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
