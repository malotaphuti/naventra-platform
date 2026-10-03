import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';

/** The app itself: signed in, and not still on an administrator-issued temporary password. */
export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (!authStore.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (authStore.user()?.mustChangePassword) {
    return router.createUrlTree(['/change-password']);
  }
  return true;
};

/** The "set your new password" page: only needs a signed-in user. */
export const signedInGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  return authStore.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
