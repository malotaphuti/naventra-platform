export interface Incident {
  id: number;
  incidentNumber: string;
  vehicleId: number;
  vehicleRegistration: string;
  vehicleStatus: string;
  driverId: number;
  driverName: string;
  tripId: number | null;
  tripNumber: string | null;
  type: string;
  status: string;
  severity: string;
  description: string;
  location: string | null;
  occurredAt: string | null;
  reviewNotes: string | null;
  reviewedByName: string | null;
  resolutionNotes: string | null;
  workOrderId: number | null;
  workOrderNumber: string | null;
  workOrderStatus: string | null;
  createdAt: string | null;
}

export const INCIDENT_TYPES = ['ACCIDENT', 'BREAKDOWN', 'THEFT', 'TYRE_BURST', 'MECHANICAL_FAILURE'];
export const INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const INCIDENT_STATUSES = ['REPORTED', 'UNDER_REVIEW', 'IN_MAINTENANCE', 'RESOLVED', 'CLOSED'];

/** Roles that review, escalate and resolve incidents (backend: SA, FM, MO). */
export const INCIDENT_HANDLER_ROLES = ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_OFFICER'];
export const INCIDENT_REPORTER_ROLES = ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER'];

/** CSS tone for a severity pill. */
export function severityTone(severity: string): 'ok' | 'warn' | 'danger' {
  if (severity === 'LOW') return 'ok';
  if (severity === 'MEDIUM') return 'warn';
  return 'danger';
}
