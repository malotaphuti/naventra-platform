package com.fleetops.service;

import com.fleetops.dto.dashboard.DashboardResponse;
import com.fleetops.dto.dashboard.DriverDashboardResponse;
import com.fleetops.dto.dashboard.MaintenanceDashboardResponse;
import com.fleetops.entity.Driver;
import com.fleetops.entity.Trip;
import com.fleetops.entity.Vehicle;
import com.fleetops.entity.enums.*;
import com.fleetops.exception.BusinessRuleException;
import com.fleetops.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;
    private final TripRepository tripRepository;
    private final FuelEntryRepository fuelEntryRepository;
    private final WorkOrderRepository workOrderRepository;
    private final IncidentRepository incidentRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getFleetOverview() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();
        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();

        long totalVehicles = vehicleRepository.countByDeletedFalse();
        long available = vehicleRepository.countByStatusAndDeletedFalse(VehicleStatus.AVAILABLE);
        long onTrip = vehicleRepository.countByStatusAndDeletedFalse(VehicleStatus.ON_TRIP);
        long inMaintenance = vehicleRepository.countByStatusAndDeletedFalse(VehicleStatus.MAINTENANCE);
        long outOfService = vehicleRepository.countByStatusAndDeletedFalse(VehicleStatus.OUT_OF_SERVICE);

        long totalDrivers = driverRepository.countByDeletedFalse();
        long activeDrivers = driverRepository.countByStatusAndDeletedFalse(DriverStatus.ACTIVE);

        long tripsToday = tripRepository.countTripsStartedBetween(startOfDay, endOfDay);
        long tripsInProgress = tripRepository.countByStatus(TripStatus.IN_PROGRESS);
        Long distanceThisMonth = tripRepository.sumDistanceBetween(startOfMonth, endOfDay);

        BigDecimal fuelCostThisMonth = fuelEntryRepository.sumTotalCostBetween(startOfMonth, endOfDay);
        BigDecimal maintenanceCostThisMonth = workOrderRepository.sumCostBetween(
                today.withDayOfMonth(1), today);

        long openIncidents = incidentRepository.countByStatusAndDeletedFalse(IncidentStatus.REPORTED)
                + incidentRepository.countByStatusAndDeletedFalse(IncidentStatus.UNDER_REVIEW);

        long upcomingMaintenance = workOrderRepository.countByStatusAndDeletedFalse(WorkOrderStatus.SCHEDULED);

        return DashboardResponse.builder()
                .totalVehicles(totalVehicles)
                .vehiclesAvailable(available)
                .vehiclesOnTrip(onTrip)
                .vehiclesInMaintenance(inMaintenance)
                .vehiclesOutOfService(outOfService)
                .totalDrivers(totalDrivers)
                .activeDrivers(activeDrivers)
                .tripsToday(tripsToday)
                .tripsInProgress(tripsInProgress)
                .totalDistanceThisMonth(distanceThisMonth != null ? distanceThisMonth : 0L)
                .fuelCostThisMonth(fuelCostThisMonth)
                .maintenanceCostThisMonth(maintenanceCostThisMonth)
                .openIncidents(openIncidents)
                .upcomingMaintenanceCount(upcomingMaintenance)
                .build();
    }

    @Transactional(readOnly = true)
    public DriverDashboardResponse getDriverDashboard(Long userId) {
        Driver driver = driverRepository.findByUserIdAndDeletedFalse(userId)
                .orElseThrow(() -> new BusinessRuleException("No driver profile is linked to your account"));
        Long driverId = driver.getId();

        LocalDate today = LocalDate.now();
        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();

        Optional<Trip> activeTrip = tripRepository.findFirstByDriverIdAndStatusInAndDeletedFalseOrderByIdDesc(
                driverId, ACTIVE_TRIP_STATUSES);

        // Prefer the formal assignment; fall back to the vehicle on the driver's active trip
        Optional<Vehicle> vehicle = Optional.ofNullable(driver.getAssignedVehicleId())
                .flatMap(vehicleRepository::findByIdAndDeletedFalse)
                .or(() -> vehicleRepository.findFirstByAssignedDriverIdAndDeletedFalse(driverId))
                .or(() -> activeTrip.map(Trip::getVehicle));

        return DriverDashboardResponse.builder()
                .driverId(driverId)
                .fullName(driver.getUser().getFullName())
                .employeeNumber(driver.getEmployeeNumber())
                .licenseClass(driver.getLicenseClass())
                .licenseExpiryDate(driver.getLicenseExpiryDate())
                .medicalCertificateExpiry(driver.getMedicalCertificateExpiry())
                .status(driver.getStatus())
                .assignedVehicle(vehicle.map(this::toVehicleSummary).orElse(null))
                .activeTrip(activeTrip.map(this::toTripSummary).orElse(null))
                .tripsThisMonth(tripRepository.countByDriverRequestedBetween(driverId, startOfMonth, endOfDay))
                .completedTripsThisMonth(tripRepository.countCompletedByDriverBetween(driverId, startOfMonth, endOfDay))
                .pendingTripRequests(tripRepository.countByDriverIdAndStatusAndDeletedFalse(driverId, TripStatus.REQUESTED))
                .distanceThisMonthKm(tripRepository.sumDistanceByDriverBetween(driverId, startOfMonth, endOfDay))
                .fuelSpendThisMonth(fuelEntryRepository.sumTotalCostByDriverBetween(driverId, startOfMonth, endOfDay))
                .openIncidents(incidentRepository.countByDriverIdAndStatusInAndDeletedFalse(driverId, OPEN_INCIDENT_STATUSES))
                .recentTrips(tripRepository.findTop5ByDriverIdAndDeletedFalseOrderByIdDesc(driverId).stream()
                        .map(this::toTripSummary)
                        .toList())
                .build();
    }

    @Transactional(readOnly = true)
    public MaintenanceDashboardResponse getMaintenanceDashboard() {
        LocalDate today = LocalDate.now();
        LocalDate in30Days = today.plusDays(30);

        List<MaintenanceDashboardResponse.ServiceDue> upcomingServices = vehicleRepository
                .findByNextServiceDateBeforeAndDeletedFalseOrderByNextServiceDateAsc(in30Days.plusDays(1)).stream()
                .filter(v -> v.getStatus() != VehicleStatus.RETIRED)
                .limit(8)
                .map(v -> MaintenanceDashboardResponse.ServiceDue.builder()
                        .vehicleId(v.getId())
                        .registrationNumber(v.getRegistrationNumber())
                        .make(v.getMake())
                        .model(v.getModel())
                        .status(v.getStatus())
                        .nextServiceDate(v.getNextServiceDate())
                        .daysUntilDue(ChronoUnit.DAYS.between(today, v.getNextServiceDate()))
                        .build())
                .toList();

        List<MaintenanceDashboardResponse.WorkOrderSummary> activeWorkOrders = workOrderRepository
                .findTop8ByStatusInAndDeletedFalseOrderByScheduledDateAsc(ACTIVE_WORK_ORDER_STATUSES).stream()
                .map(w -> MaintenanceDashboardResponse.WorkOrderSummary.builder()
                        .id(w.getId())
                        .workOrderNumber(w.getWorkOrderNumber())
                        .vehicleRegistration(w.getVehicle().getRegistrationNumber())
                        .type(w.getType())
                        .status(w.getStatus())
                        .description(w.getDescription())
                        .scheduledDate(w.getScheduledDate())
                        .build())
                .toList();

        return MaintenanceDashboardResponse.builder()
                .totalVehicles(vehicleRepository.countByDeletedFalse())
                .vehiclesInMaintenance(vehicleRepository.countByStatusAndDeletedFalse(VehicleStatus.MAINTENANCE))
                .vehiclesOutOfService(vehicleRepository.countByStatusAndDeletedFalse(VehicleStatus.OUT_OF_SERVICE))
                .servicesOverdue(vehicleRepository.countByNextServiceDateBeforeAndDeletedFalse(today))
                .servicesDueNext30Days(vehicleRepository.countByNextServiceDateBetweenAndDeletedFalse(today, in30Days))
                .licensesExpiringNext30Days(vehicleRepository.countByLicenseExpiryDateBetweenAndDeletedFalse(today, in30Days))
                .insuranceExpiringNext30Days(vehicleRepository.countByInsuranceExpiryDateBetweenAndDeletedFalse(today, in30Days))
                .workOrdersScheduled(workOrderRepository.countByStatusAndDeletedFalse(WorkOrderStatus.SCHEDULED))
                .workOrdersInProgress(workOrderRepository.countByStatusInAndDeletedFalse(
                        List.of(WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS)))
                .workOrdersAwaitingParts(workOrderRepository.countByStatusAndDeletedFalse(WorkOrderStatus.AWAITING_PARTS))
                .maintenanceCostThisMonth(workOrderRepository.sumCostBetween(today.withDayOfMonth(1), today))
                .upcomingServices(upcomingServices)
                .activeWorkOrders(activeWorkOrders)
                .build();
    }

    private static final List<TripStatus> ACTIVE_TRIP_STATUSES =
            List.of(TripStatus.APPROVED, TripStatus.ALLOCATED, TripStatus.IN_PROGRESS);

    private static final List<IncidentStatus> OPEN_INCIDENT_STATUSES =
            List.of(IncidentStatus.REPORTED, IncidentStatus.UNDER_REVIEW, IncidentStatus.IN_MAINTENANCE);

    private static final List<WorkOrderStatus> ACTIVE_WORK_ORDER_STATUSES = List.of(
            WorkOrderStatus.SCHEDULED, WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.AWAITING_PARTS);

    private DriverDashboardResponse.VehicleSummary toVehicleSummary(Vehicle v) {
        return DriverDashboardResponse.VehicleSummary.builder()
                .id(v.getId())
                .registrationNumber(v.getRegistrationNumber())
                .make(v.getMake())
                .model(v.getModel())
                .year(v.getYear())
                .color(v.getColor())
                .fuelType(v.getFuelType())
                .status(v.getStatus())
                .currentOdometerKm(v.getCurrentOdometerKm())
                .licenseExpiryDate(v.getLicenseExpiryDate())
                .insuranceExpiryDate(v.getInsuranceExpiryDate())
                .nextServiceDate(v.getNextServiceDate())
                .build();
    }

    private DriverDashboardResponse.TripSummary toTripSummary(Trip t) {
        return DriverDashboardResponse.TripSummary.builder()
                .id(t.getId())
                .tripNumber(t.getTripNumber())
                .status(t.getStatus())
                .origin(t.getOrigin())
                .destination(t.getDestination())
                .vehicleRegistration(t.getVehicle().getRegistrationNumber())
                .requestedAt(t.getRequestedAt())
                .startedAt(t.getStartedAt())
                .completedAt(t.getCompletedAt())
                .distanceKm(t.getDistanceKm())
                .build();
    }
}
