import { CredentialsDelivery } from '../../../shared/dialogs/credentials-dialog.component';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  enabled: boolean;
  emailVerified: boolean;
  accountLocked: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
  hasDriverProfile: boolean;
  mustChangePassword: boolean;
  /** Only on create / reset-password responses. */
  credentials?: CredentialsDelivery;
}

export const ROLES = ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER', 'MAINTENANCE_OFFICER', 'EXECUTIVE'];
