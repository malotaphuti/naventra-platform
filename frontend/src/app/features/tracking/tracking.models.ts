export interface LivePosition {
  vehicleId: number;
  registrationNumber: string;
  make: string;
  model: string;
  status: string;
  driverName: string | null;
  tripId: number | null;
  tripNumber: string | null;
  origin: string | null;
  destination: string | null;
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  headingDeg: number | null;
  recordedAt: string | null;
  progressPercent: number | null;
  moving: boolean;
}

export interface TrackPlace {
  name: string;
  latitude: number;
  longitude: number;
}

export interface TripTrack {
  tripId: number;
  tripNumber: string;
  status: string;
  origin: TrackPlace;
  destination: TrackPlace;
  points: { latitude: number; longitude: number; speedKmh: number | null; recordedAt: string }[];
}

export type TrackingFilter = 'ALL' | 'MOVING' | 'PARKED';

export const STATUS_COLORS: Record<string, string> = {
  ON_TRIP: '#2563eb',
  AVAILABLE: '#16a34a',
  RESERVED: '#7c3aed',
  MAINTENANCE: '#d97706',
  OUT_OF_SERVICE: '#dc2626'
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#475569';
}

export function escapeHtml(value: string | null | undefined): string {
  return (value ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
