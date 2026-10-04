import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthStore, UserInfo } from '../stores/auth.store';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserInfo;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);
  private readonly baseUrl = '/api/v1/auth';

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, request).pipe(
      tap(response => {
        this.authStore.setAuth(response.accessToken, response.refreshToken, response.user);
      })
    );
  }

  logout(): void {
    const token = this.authStore.accessToken();
    if (token) {
      this.http.post(`${this.baseUrl}/logout`, {}).subscribe();
    }
    this.authStore.clearAuth();
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.authStore.refreshToken();
    return this.http.post<AuthResponse>(`${this.baseUrl}/refresh`, { refreshToken }).pipe(
      tap(response => {
        this.authStore.setAuth(response.accessToken, response.refreshToken, response.user);
      })
    );
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/forgot-password`, { email });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/change-password`, {
      currentPassword,
      newPassword
    });
  }
}
