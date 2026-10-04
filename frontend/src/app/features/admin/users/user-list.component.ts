import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { AuthStore } from '../../../core/stores/auth.store';
import { NotifyService } from '../../../core/services/notify.service';
import { Page } from '../../../core/models/page.model';
import { DialogService } from '../../../shared/dialogs/dialog.service';
import { ROLE_LABELS } from '../../../core/layout/shell/shell.component';
import { AdminUser, ROLES } from './user.models';
import { UserDialogComponent, UserDialogData } from './user-dialog.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule, MatMenuModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatPaginatorModule, MatProgressSpinnerModule, MatDialogModule
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Users</h1>
        <p>Login accounts, roles and access.</p>
      </div>
      <div class="head-actions">
        <button mat-flat-button color="primary" (click)="create()"><mat-icon>person_add</mat-icon> New user</button>
      </div>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline" class="grow">
        <mat-label>Search</mat-label>
        <input matInput [(ngModel)]="search" (keyup.enter)="reload()" placeholder="Username, name or email">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Role</mat-label>
        <mat-select [(ngModel)]="role" (selectionChange)="reload()">
          <mat-option [value]="null">All roles</mat-option>
          @for (r of roles; track r) { <mat-option [value]="r">{{ roleLabels[r] }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Status</mat-label>
        <mat-select [(ngModel)]="enabled" (selectionChange)="reload()">
          <mat-option [value]="null">All</mat-option>
          <mat-option [value]="true">Enabled</mat-option>
          <mat-option [value]="false">Disabled</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <div class="table-wrap">
      <table mat-table [dataSource]="users()">
        <ng-container matColumnDef="user">
          <th mat-header-cell *matHeaderCellDef>User</th>
          <td mat-cell *matCellDef="let u">
            <strong>{{ u.fullName }}</strong>@if (u.id === myId) { <span class="sub"> (you)</span> }
            <div class="sub">{{ u.username }} · {{ u.email }}</div>
          </td>
        </ng-container>
        <ng-container matColumnDef="role">
          <th mat-header-cell *matHeaderCellDef>Role</th>
          <td mat-cell *matCellDef="let u">
            <span class="pill">{{ roleLabels[u.role] || u.role }}</span>
            @if (u.hasDriverProfile) { <mat-icon class="tiny" title="Has a driver profile">badge</mat-icon> }
          </td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let u">
            <span class="pill" [ngClass]="u.enabled ? 'ok' : 'danger'">{{ u.enabled ? 'Enabled' : 'Disabled' }}</span>
            @if (u.accountLocked) { <span class="pill warn">Locked</span> }
            @if (u.mustChangePassword) { <span class="pill warn" title="Signed in only with a temporary password so far">Temp password</span> }
            @if (!u.emailVerified) { <span class="pill warn">Unverified</span> }
          </td>
        </ng-container>
        <ng-container matColumnDef="lastLogin">
          <th mat-header-cell *matHeaderCellDef>Last login</th>
          <td mat-cell *matCellDef="let u">{{ (u.lastLoginAt | date:'d MMM y, HH:mm') || 'Never' }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let u">
            <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="User actions"><mat-icon>more_vert</mat-icon></button>
            <mat-menu #menu="matMenu" xPosition="before">
              <button mat-menu-item (click)="edit(u)"><mat-icon>edit</mat-icon>Edit</button>
              @if (u.enabled) {
                <button mat-menu-item (click)="setEnabled(u, false)" [disabled]="u.id === myId"><mat-icon>block</mat-icon>Disable</button>
              } @else {
                <button mat-menu-item (click)="setEnabled(u, true)"><mat-icon>check_circle</mat-icon>Enable</button>
              }
              @if (u.accountLocked) {
                <button mat-menu-item (click)="unlock(u)"><mat-icon>lock_open</mat-icon>Unlock</button>
              }
              <button mat-menu-item (click)="resetPassword(u)"><mat-icon>password</mat-icon>Reset password</button>
              <button mat-menu-item (click)="remove(u)" [disabled]="u.id === myId"><mat-icon>delete</mat-icon>Delete</button>
            </mat-menu>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
      @if (loading()) {
        <div class="loading-container"><mat-spinner diameter="36"></mat-spinner></div>
      } @else if (!users().length) {
        <div class="empty"><mat-icon>manage_accounts</mat-icon>No users match your filters.</div>
      }
      <mat-paginator [length]="total()" [pageIndex]="page" [pageSize]="size" [pageSizeOptions]="[10, 20, 50]"
                     (page)="onPage($event)"></mat-paginator>
    </div>
  `,
  styles: [`
    .sub { font-size: 0.78rem; color: var(--fo-muted); }
    td .pill + .pill { margin-left: 0.35rem; }
    .tiny { font-size: 18px; width: 18px; height: 18px; vertical-align: middle; margin-left: 0.35rem; color: var(--fo-muted); }
  `]
})
export class UserListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly dialog = inject(MatDialog);
  private readonly dialogs = inject(DialogService);
  private readonly notify = inject(NotifyService);
  private readonly authStore = inject(AuthStore);

  readonly users = signal<AdminUser[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly columns = ['user', 'role', 'status', 'lastLogin', 'actions'];
  readonly roles = ROLES;
  readonly roleLabels = ROLE_LABELS;
  readonly myId = this.authStore.user()?.id;

  search = '';
  role: string | null = null;
  enabled: boolean | null = null;
  page = 0;
  size = 20;

  ngOnInit(): void { this.load(); }

  reload(): void {
    this.page = 0;
    this.load();
  }

  load(): void {
    let params = new HttpParams().set('page', this.page).set('size', this.size).set('sort', 'username,asc');
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.role) params = params.set('role', this.role);
    if (this.enabled !== null) params = params.set('enabled', this.enabled);
    this.loading.set(true);
    this.http.get<Page<AdminUser>>('/api/v1/admin/users', { params }).subscribe({
      next: r => {
        this.users.set(r.content);
        this.total.set(r.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex;
    this.size = e.pageSize;
    this.load();
  }

  create(): void {
    this.openDialog({}).subscribe(u => {
      if (!u) return;
      this.load();
      if (u.credentials) {
        this.dialogs.credentials({ username: u.username, fullName: u.fullName, credentials: u.credentials }).subscribe();
      } else {
        this.notify.success(`User ${u.username} created`);
      }
    });
  }

  edit(user: AdminUser): void {
    this.openDialog({ user, self: user.id === this.myId }).subscribe(u => {
      if (!u) return;
      this.notify.success(`User ${u.username} updated`);
      this.load();
    });
  }

  setEnabled(user: AdminUser, value: boolean): void {
    const run = () => this.http.patch<AdminUser>(`/api/v1/admin/users/${user.id}/enabled`, null,
      { params: new HttpParams().set('value', value) }).subscribe(() => {
        this.notify.success(`${user.username} ${value ? 'enabled' : 'disabled'}`);
        this.load();
      });
    if (value) {
      run();
      return;
    }
    this.dialogs.confirm({
      title: 'Disable user',
      message: `Disable ${user.fullName} (${user.username})? They will not be able to log in.`,
      confirmText: 'Disable',
      danger: true
    }).subscribe(ok => ok && run());
  }

  unlock(user: AdminUser): void {
    this.http.post(`/api/v1/admin/users/${user.id}/unlock`, null).subscribe(() => {
      this.notify.success(`${user.username} unlocked`);
      this.load();
    });
  }

  resetPassword(user: AdminUser): void {
    this.dialogs.confirm({
      title: `Reset password for ${user.username}`,
      message: `A new temporary password will be e-mailed to ${user.email}. ${user.fullName} will be signed out `
        + 'everywhere and must choose a new password at their next sign-in.',
      confirmText: 'Reset and e-mail'
    }).subscribe(ok => {
      if (!ok) return;
      this.http.post<AdminUser>(`/api/v1/admin/users/${user.id}/reset-password`, null).subscribe(u => {
        this.load();
        if (u.credentials) {
          this.dialogs.credentials({ username: u.username, fullName: u.fullName, credentials: u.credentials, reset: true })
            .subscribe();
        }
      });
    });
  }

  remove(user: AdminUser): void {
    this.dialogs.confirm({
      title: 'Delete user',
      message: `Delete ${user.fullName} (${user.username})? This cannot be undone from the UI.`,
      confirmText: 'Delete',
      danger: true
    }).subscribe(ok => {
      if (!ok) return;
      this.http.delete(`/api/v1/admin/users/${user.id}`).subscribe(() => {
        this.notify.success(`${user.username} deleted`);
        this.load();
      });
    });
  }

  private openDialog(data: UserDialogData): Observable<AdminUser | undefined> {
    return this.dialog.open(UserDialogComponent, { data, width: '480px' }).afterClosed();
  }
}
