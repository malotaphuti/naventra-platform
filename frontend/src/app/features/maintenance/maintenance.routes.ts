import { Routes } from '@angular/router';

export const MAINTENANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./maintenance-list/maintenance-list.component').then(m => m.MaintenanceListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./maintenance-form/maintenance-form.component').then(m => m.MaintenanceFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./work-order-detail/work-order-detail.component').then(m => m.WorkOrderDetailComponent)
  }
];
