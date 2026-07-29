package com.fleetops.service;

import com.fleetops.dto.dashboard.DashboardResponse;
import com.fleetops.entity.enums.*;
import com.fleetops.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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
}
