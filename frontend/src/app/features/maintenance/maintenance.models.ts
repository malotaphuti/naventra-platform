export interface WorkOrder {
  id: number;
  workOrderNumber: string;
  vehicleId: number;
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleStatus: string;
  vehicleOdometerKm: number | null;
  type: string;
  status: string;
  description: string;
  serviceType: string | null;
  workshop: string | null;
  mechanicName: string | null;
  scheduledDate: string | null;
  startedDate: string | null;
  completedDate: string | null;
  labourCost: number | null;
  partsCost: number | null;
  totalCost: number | null;
  invoiceNumber: string | null;
  invoiceUrl: string | null;
  partsUsed: string | null;
  notes: string | null;
  nextServiceDate: string | null;
  nextServiceMileageKm: number | null;
  createdAt: string | null;
  createdBy: string | null;
}

export const WORK_ORDER_STATUSES = ['SCHEDULED', 'OPEN', 'IN_PROGRESS', 'AWAITING_PARTS', 'COMPLETED', 'CANCELLED'];
export const MAINTENANCE_TYPES = ['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY'];
export const SERVICE_TYPES = [
  'Minor service', 'Major service', 'Brakes', 'Tyres', 'Electrical', 'Engine', 'Transmission',
  'Suspension', 'Bodywork', 'Roadworthy inspection', 'Other'
];

/** Roles allowed to manage work orders (backend: SA, FM, MO). */
export const MAINTAINER_ROLES = ['SYSTEM_ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_OFFICER'];

/** Parses a backend LocalDate ("2026-10-02") as a local calendar day, not UTC midnight. */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}
