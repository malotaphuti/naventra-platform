import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthStore } from '../stores/auth.store';
import { AuthService } from '../services/auth.service';
import { NotifyService } from '../services/notify.service';
import { errorMessage } from '../models/page.model';

/** Set on a request to stop the interceptor showing an error toast (the caller handles the error itself). */
export const SILENT_ERRORS = new HttpContextToken<boolean>(() => false);

/** One refresh in flight at a time; concurrent 401s wait for the same new token. */
let refreshInFlight$: Observable<string> | null = null;

/** Calls that must never trigger a refresh-and-retry. */
const isAuthCall = (url: string) =>
  url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout');

/** Login and refresh go without a bearer token; logout keeps it so the server can revoke the session. */
const withToken = (req: HttpRequest<unknown>, token: string | null) =>
  token && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh')
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const notify = inject(NotifyService);
  const router = inject(Router);

  const endSession = () => {
    if (authStore.isAuthenticated()) {
      notify.error('Your session has expired. Please log in again.');
    }
    authStore.clearAuth();
    router.navigate(['/login']);
  };

  return next(withToken(req, authStore.accessToken())).pipe(
    catchError((error: HttpErrorResponse) => {
      // Expired access token: refresh once, then replay the original request
      if (error.status === 401 && !isAuthCall(req.url) && authStore.refreshToken()) {
        refreshInFlight$ ??= authService.refreshToken().pipe(
          map(res => res.accessToken),
          finalize(() => (refreshInFlight$ = null)),
          shareReplay(1)
        );
        return refreshInFlight$.pipe(
          catchError(refreshError => {
            endSession();
            return throwError(() => refreshError);
          }),
          switchMap(token => next(withToken(req, token)))
        );
      }

      if (error.status === 403 && error.error?.code === 'PASSWORD_CHANGE_REQUIRED') {
        // Still on a temporary password: send the user to set their own (no error toast)
        authStore.requirePasswordChange();
        router.navigate(['/change-password']);
      } else if (error.status === 401 && !isAuthCall(req.url)) {
        endSession();
      } else if (!req.context.get(SILENT_ERRORS) && !isAuthCall(req.url)) {
        notify.error(error.status === 0
          ? 'Cannot reach the server. Check your connection.'
          : errorMessage(error));
      }
      return throwError(() => error);
    })
  );
};
