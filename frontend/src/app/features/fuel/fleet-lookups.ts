import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { Page } from '../../core/models/page.model';

/** Lookup data shared by the fuel, maintenance and incident forms. */

export interface VehicleOption {
  id: number;
  registrationNumber: string;
  make: string;
  model: string;
  status: string;
  currentOdometerKm: number | null;
  assignedDriverId?: number | null;
}

export interface DriverOption {
  id: number;
  fullName: string;
  employeeNumber: string;
  assignedVehicleId: number | null;
}

export interface TripOption {
  id: number;
  tripNumber: string;
  vehicleId: number;
  vehicleRegistration: string;
  driverId: number;
  driverName: string;
  origin: string;
  destination: string;
}

/** What a DRIVER may log against: their assigned vehicle and/or the vehicle of their trip in progress. */
export interface DriverContext {
  driverId: number;
  vehicles: VehicleOption[];
  activeTrip: TripOption | null;
}

export function loadVehicles(http: HttpClient): Observable<VehicleOption[]> {
  return http.get<Page<VehicleOption>>('/api/v1/vehicles', { params: { size: 200, sort: 'registrationNumber,asc' } })
    .pipe(map(p => p.content ?? []));
}

export function loadActiveDrivers(http: HttpClient): Observable<DriverOption[]> {
  return http.get<DriverOption[]>('/api/v1/drivers/active');
}

export function loadTripsInProgress(http: HttpClient): Observable<TripOption[]> {
  return http.get<Page<TripOption>>('/api/v1/trips', { params: { status: 'IN_PROGRESS', size: 200 } })
    .pipe(map(p => p.content ?? []), catchError(() => of([])));
}

export function loadDriverContext(http: HttpClient): Observable<DriverContext> {
  return http.get<any>('/api/v1/dashboard/driver').pipe(
    switchMap(d => {
      const trip$: Observable<TripOption | null> = d.activeTrip
        ? http.get<TripOption>(`/api/v1/trips/${d.activeTrip.id}`)
        : of(null);
      return trip$.pipe(
        switchMap(trip => {
          const assigned: VehicleOption | null = d.assignedVehicle ?? null;
          const tripVehicle$: Observable<VehicleOption | null> = trip && trip.vehicleId !== assigned?.id
            ? http.get<VehicleOption>(`/api/v1/vehicles/${trip.vehicleId}`).pipe(catchError(() => of(null)))
            : of(null);
          return forkJoin([of(assigned), tripVehicle$]).pipe(
            map(([a, t]) => ({
              driverId: d.driverId,
              // The trip vehicle comes first: it is the one the driver is actually using right now.
              vehicles: [t, a].filter((v): v is VehicleOption => !!v),
              activeTrip: trip
            }))
          );
        })
      );
    })
  );
}

export function vehicleLabel(v: VehicleOption): string {
  return `${v.registrationNumber} · ${v.make} ${v.model}`;
}
