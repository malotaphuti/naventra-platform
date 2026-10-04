package com.fleetops.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {

    private long totalVehicles;
    private long vehiclesAvailable;
    private long vehiclesOnTrip;
    private long vehiclesInMaintenance;
    private long vehiclesOutOfService;

    private long totalDrivers;
    private long activeDrivers;

    private long tripsToday;
    private long tripsInProgress;
    private long totalDistanceThisMonth;

    private BigDecimal fuelCostThisMonth;
    private BigDecimal maintenanceCostThisMonth;

    private long openIncidents;
    private long upcomingMaintenanceCount;
}
