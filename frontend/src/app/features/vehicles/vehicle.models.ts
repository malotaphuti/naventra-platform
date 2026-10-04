export interface Vehicle {
  id: number;
  registrationNumber: string;
  vin: string | null;
  engineNumber: string | null;
  chassisNumber: string | null;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  color: string | null;
  fuelType: string | null;
  seatingCapacity: number;
  engineCapacityCc: number;
  purchaseDate: string | null;
  purchaseCost: number | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  insuranceExpiryDate: string | null;
  licenseExpiryDate: string | null;
  currentOdometerKm: number;
  status: string;
  assignedDriverId: number | null;
  assignedDriverName: string | null;
  nextServiceDate: string | null;
  nextServiceMileageKm: number | null;
  createdAt: string | null;
}

export const VEHICLE_STATUSES = ['AVAILABLE', 'ON_TRIP', 'RESERVED', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED'];

/** Mirrors VehicleService.VALID_TRANSITIONS on the backend. */
export const VEHICLE_TRANSITIONS: Record<string, string[]> = {
  AVAILABLE: ['ON_TRIP', 'RESERVED', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED'],
  ON_TRIP: ['AVAILABLE', 'MAINTENANCE'],
  RESERVED: ['ON_TRIP', 'AVAILABLE'],
  MAINTENANCE: ['AVAILABLE', 'OUT_OF_SERVICE'],
  OUT_OF_SERVICE: ['MAINTENANCE', 'RETIRED', 'AVAILABLE'],
  RETIRED: []
};

export const FUEL_TYPES = ['Diesel', 'Petrol'];
