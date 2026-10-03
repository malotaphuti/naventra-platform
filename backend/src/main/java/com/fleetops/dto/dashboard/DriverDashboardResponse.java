package com.fleetops.dto.dashboard;

import com.fleetops.entity.enums.DriverStatus;
import com.fleetops.entity.enums.LicenseClass;
import com.fleetops.entity.enums.TripStatus;
import com.fleetops.entity.enums.VehicleStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Personal dashboard for the authenticated driver. Contains only that driver's own data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverDashboardResponse {

    private Long driverId;
    private String fullName;
    private String employeeNumber;
    private LicenseClass licenseClass;
    private LocalDate licenseExpiryDate;
    private LocalDate medicalCertificateExpiry;
    private DriverStatus status;

    private VehicleSummary assignedVehicle;
    private TripSummary activeTrip;

    private long tripsThisMonth;
    private long completedTripsThisMonth;
    private long pendingTripRequests;
    private long distanceThisMonthKm;
    private BigDecimal fuelSpendThisMonth;
    private long openIncidents;

    private List<TripSummary> recentTrips;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VehicleSummary {
        private Long id;
        private String registrationNumber;
        private String make;
        private String model;
        private int year;
        private String color;
        private String fuelType;
        private VehicleStatus status;
        private Long currentOdometerKm;
        private LocalDate licenseExpiryDate;
        private LocalDate insuranceExpiryDate;
        private LocalDate nextServiceDate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TripSummary {
        private Long id;
        private String tripNumber;
        private TripStatus status;
        private String origin;
        private String destination;
        private String vehicleRegistration;
        private LocalDateTime requestedAt;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private Long distanceKm;
    }
}
