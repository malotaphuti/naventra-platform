export interface FleetOverview {
  totalVehicles: number;
  vehiclesAvailable: number;
  vehiclesOnTrip: number;
  vehiclesInMaintenance: number;
  vehiclesOutOfService: number;
  totalDrivers: number;
  activeDrivers: number;
  tripsToday: number;
  tripsInProgress: number;
  totalDistanceThisMonth: number;
  fuelCostThisMonth: number;
  maintenanceCostThisMonth: number;
  openIncidents: number;
  upcomingMaintenanceCount: number;
}

export interface VehicleSummary {
  id: number;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  fuelType: string | null;
  status: string;
  currentOdometerKm: number;
  licenseExpiryDate: string | null;
  insuranceExpiryDate: string | null;
  nextServiceDate: string | null;
}

export interface TripSummary {
  id: number;
  tripNumber: string;
  status: string;
  origin: string;
  destination: string;
  vehicleRegistration: string;
  requestedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  distanceKm: number | null;
}

export interface DriverDashboard {
  driverId: number;
  fullName: string;
  employeeNumber: string;
  licenseClass: string | null;
  licenseExpiryDate: string;
  medicalCertificateExpiry: string | null;
  status: string;
  assignedVehicle: VehicleSummary | null;
  activeTrip: TripSummary | null;
  tripsThisMonth: number;
  completedTripsThisMonth: number;
  pendingTripRequests: number;
  distanceThisMonthKm: number;
  fuelSpendThisMonth: number;
  openIncidents: number;
  recentTrips: TripSummary[];
}

export interface ServiceDue {
  vehicleId: number;
  registrationNumber: string;
  make: string;
  model: string;
  status: string;
  nextServiceDate: string;
  daysUntilDue: number;
}

export interface WorkOrderSummary {
  id: number;
  workOrderNumber: string;
  vehicleRegistration: string;
  type: string;
  status: string;
  description: string;
  scheduledDate: string | null;
}

export interface MaintenanceDashboard {
  totalVehicles: number;
  vehiclesInMaintenance: number;
  vehiclesOutOfService: number;
  servicesOverdue: number;
  servicesDueNext30Days: number;
  licensesExpiringNext30Days: number;
  insuranceExpiringNext30Days: number;
  workOrdersScheduled: number;
  workOrdersInProgress: number;
  workOrdersAwaitingParts: number;
  maintenanceCostThisMonth: number;
  upcomingServices: ServiceDue[];
  activeWorkOrders: WorkOrderSummary[];
}

export interface StatusSegment {
  label: string;
  value: number;
  color: string;
  percent: number;
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Generic account names that describe a role rather than a person, e.g. the seeded "System Administrator". */
const ROLE_ACCOUNT_NAMES = /^(system administrator|administrator|admin|fleet manager|maintenance officer|executive|driver)$/i;

/**
 * Name to greet the user by: first name for a person ("Sipho Ndaba" → "Sipho"),
 * the role noun for a generic role account ("System Administrator" → "Administrator").
 */
export function firstName(fullName: string | null | undefined): string {
  const name = (fullName ?? '').trim();
  if (!name) return 'there';
  const parts = name.split(/\s+/);
  return ROLE_ACCOUNT_NAMES.test(name) ? parts[parts.length - 1] : parts[0];
}

/** Whole days from today until the given ISO date (negative when in the past). */
export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(date + 'T00:00:00').getTime() - today.getTime()) / 86_400_000);
}

/** CSS tone for a date-based deadline: overdue → danger, within 30 days → warn. */
export function expiryTone(date: string | null | undefined): 'danger' | 'warn' | 'ok' {
  const days = daysUntil(date);
  if (days === null) return 'ok';
  if (days < 0) return 'danger';
  return days <= 30 ? 'warn' : 'ok';
}

export function humanize(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

export function fleetSegments(o: FleetOverview): StatusSegment[] {
  const reserved = Math.max(0, o.totalVehicles - o.vehiclesAvailable - o.vehiclesOnTrip
    - o.vehiclesInMaintenance - o.vehiclesOutOfService);
  const total = o.totalVehicles || 1;
  return [
    { label: 'Available', value: o.vehiclesAvailable, color: '#16a34a' },
    { label: 'On trip', value: o.vehiclesOnTrip, color: '#2563eb' },
    { label: 'Reserved / other', value: reserved, color: '#7c3aed' },
    { label: 'In maintenance', value: o.vehiclesInMaintenance, color: '#d97706' },
    { label: 'Out of service', value: o.vehiclesOutOfService, color: '#dc2626' }
  ].map(s => ({ ...s, percent: (s.value / total) * 100 }));
}
