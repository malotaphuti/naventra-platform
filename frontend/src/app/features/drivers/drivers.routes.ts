import { Routes } from '@angular/router';

export const DRIVER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./driver-list/driver-list.component').then(m => m.DriverListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./driver-form/driver-form.component').then(m => m.DriverFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./driver-form/driver-form.component').then(m => m.DriverFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./driver-detail/driver-detail.component').then(m => m.DriverDetailComponent)
  }
];
