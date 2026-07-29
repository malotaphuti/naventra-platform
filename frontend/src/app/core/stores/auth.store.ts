import { Injectable, signal, computed } from '@angular/core';

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly state = signal<AuthState>(this.loadFromStorage());

  readonly accessToken = computed(() => this.state().accessToken);
  readonly refreshToken = computed(() => this.state().refreshToken);
  readonly user = computed(() => this.state().user);
  readonly isAuthenticated = computed(() => !!this.state().accessToken);
  readonly userRole = computed(() => this.state().user?.role ?? null);

  setAuth(accessToken: string, refreshToken: string, user: UserInfo): void {
    const newState: AuthState = { accessToken, refreshToken, user };
    this.state.set(newState);
    localStorage.setItem('fleetops_auth', JSON.stringify(newState));
  }

  clearAuth(): void {
    this.state.set({ accessToken: null, refreshToken: null, user: null });
    localStorage.removeItem('fleetops_auth');
  }

  hasRole(role: string): boolean {
    return this.state().user?.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const userRole = this.state().user?.role;
    return userRole != null && roles.includes(userRole);
  }

  private loadFromStorage(): AuthState {
    try {
      const stored = localStorage.getItem('fleetops_auth');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Invalid data in storage
    }
    return { accessToken: null, refreshToken: null, user: null };
  }
}
