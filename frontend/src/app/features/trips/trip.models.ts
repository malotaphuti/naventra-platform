export interface Trip {
  id: number;
  tripNumber: string;
  vehicleId: number;
  vehicleRegistration: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  driverId: number;
  driverName: string | null;
  status: TripStatus;
  origin: string;
  destination: string;
  purpose: string | null;
  passengers: number | null;
  cargo: string | null;
  requestedAt: string | null;
  approvedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  startMileageKm: number | null;
  endMileageKm: number | null;
  distanceKm: number | null;
  rejectionReason: string | null;
  /** Cancellation reason. */
  reviewNotes: string | null;
  approvedByName: string | null;
}

export type TripStatus =
  | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'ALLOCATED' | 'IN_PROGRESS'
  | 'COMPLETED' | 'UNDER_REVIEW' | 'CLOSED' | 'CANCELLED';

export const TRIP_STATUSES: TripStatus[] = [
  'REQUESTED', 'APPROVED', 'REJECTED', 'ALLOCATED', 'IN_PROGRESS',
  'COMPLETED', 'UNDER_REVIEW', 'CLOSED', 'CANCELLED'
];

export const TRIP_MANAGER_ROLES = ['SYSTEM_ADMIN', 'FLEET_MANAGER'];
