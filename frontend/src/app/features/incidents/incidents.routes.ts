import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const INCIDENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./incident-list/incident-list.component').then(m => m.IncidentListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./incident-form/incident-form.component').then(m => m.IncidentFormComponent),
    canActivate: [roleGuard],
    data: { roles: ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER'] }
  },
  {
    path: ':id',
    loadComponent: () => import('./incident-detail/incident-detail.component').then(m => m.IncidentDetailComponent)
  }
];
