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
        loadChildren: () => import('./features/vehicles/vehicles.routes').then(m => m.VEHICLE_ROUTES),
        canActivate: [roleGuard],
        data: { roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_OFFICER', 'EXECUTIVE'] }
      },
      {
        path: 'my-vehicle',
        loadComponent: () => import('./features/driver/my-vehicle/my-vehicle.component').then(m => m.MyVehicleComponent),
        canActivate: [roleGuard],
        data: { roles: ['DRIVER'] }
      },
      {
        path: 'drivers',
        loadChildren: () => import('./features/drivers/drivers.routes').then(m => m.DRIVER_ROUTES),
        canActivate: [roleGuard],
        data: { roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER'] }
      },
      {
        path: 'trips',
        loadChildren: () => import('./features/trips/trips.routes').then(m => m.TRIP_ROUTES),
        canActivate: [roleGuard],
        data: { roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'EXECUTIVE'] }
      },
      {
        path: 'my-trips',
        loadComponent: () => import('./features/driver/my-trips/my-trips.component').then(m => m.MyTripsComponent),
        canActivate: [roleGuard],
        data: { roles: ['DRIVER'] }
      },
      {
        path: 'fuel',
        loadChildren: () => import('./features/fuel/fuel.routes').then(m => m.FUEL_ROUTES),
        canActivate: [roleGuard],
        data: { roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER'] }
      },
      {
        path: 'maintenance',
        loadChildren: () => import('./features/maintenance/maintenance.routes').then(m => m.MAINTENANCE_ROUTES),
        canActivate: [roleGuard],
        data: { roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_OFFICER'] }
      },
      {
        path: 'incidents',
        loadChildren: () => import('./features/incidents/incidents.routes').then(m => m.INCIDENT_ROUTES),
        canActivate: [roleGuard],
        data: { roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER'] }
      },
      {
        path: 'tracking',
        loadComponent: () => import('./features/tracking/tracking.component').then(m => m.TrackingComponent),
        canActivate: [roleGuard],
        data: { roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'EXECUTIVE'] }
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
