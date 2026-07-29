import { Routes } from '@angular/router';

export const VEHICLE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./vehicle-list/vehicle-list.component').then(m => m.VehicleListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./vehicle-form/vehicle-form.component').then(m => m.VehicleFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./vehicle-detail/vehicle-detail.component').then(m => m.VehicleDetailComponent)
  }
];
