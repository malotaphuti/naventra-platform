import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  { path: '', redirectTo: 'users', pathMatch: 'full' },
  {
    path: 'users',
    loadComponent: () => import('./users/user-list.component').then(m => m.UserListComponent)
  },
  {
    path: 'audit',
    loadComponent: () => import('./audit/audit-log.component').then(m => m.AuditLogComponent)
  }
];
