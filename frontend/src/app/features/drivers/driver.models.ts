import { CredentialsDelivery } from '../../shared/dialogs/credentials-dialog.component';

export interface Driver {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  employeeNumber: string;
  licenseNumber: string;
  licenseClass: string | null;
  licenseExpiryDate: string;
  medicalCertificateExpiry: string | null;
  contactNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactNumber: string | null;
  status: string;
  assignedVehicleId: number | null;
  assignedVehicleRegistration: string | null;
  /** Only when a driver was registered with a new login. */
  credentials?: CredentialsDelivery;
}

export interface EligibleUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
}

export const DRIVER_STATUSES = ['ACTIVE', 'ON_TRIP', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'];

/** Statuses a manager can set by hand (ON_TRIP is driven by trips). */
export const SETTABLE_DRIVER_STATUSES = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'];

export const LICENSE_CLASSES: { value: string; label: string }[] = [
  { value: 'A', label: 'A — Motorcycle' },
  { value: 'A1', label: 'A1 — Light motorcycle' },
  { value: 'B', label: 'B — Light motor vehicle' },
  { value: 'C', label: 'C — Heavy motor vehicle' },
  { value: 'C1', label: 'C1 — Heavy motor vehicle (≤16 t)' },
  { value: 'EB', label: 'EB — Articulated light vehicle' },
  { value: 'EC', label: 'EC — Articulated heavy vehicle' },
  { value: 'EC1', label: 'EC1 — Articulated heavy vehicle (≤16 t)' }
];

/** Same rule as the backend password policy. */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
export const PASSWORD_HINT = 'Min 8 chars with upper, lower, digit and one of @$!%*?&';
