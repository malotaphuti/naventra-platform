import { Routes } from '@angular/router';

export const TRIP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./trip-list/trip-list.component').then(m => m.TripListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./trip-form/trip-form.component').then(m => m.TripFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./trip-detail/trip-detail.component').then(m => m.TripDetailComponent)
  }
];
