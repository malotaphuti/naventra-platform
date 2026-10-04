package com.fleetops.dto.dashboard;

import com.fleetops.entity.enums.MaintenanceType;
import com.fleetops.entity.enums.VehicleStatus;
import com.fleetops.entity.enums.WorkOrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Workshop-focused dashboard for maintenance officers: vehicle downtime, service schedule and work orders.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceDashboardResponse {

    private long totalVehicles;
    private long vehiclesInMaintenance;
    private long vehiclesOutOfService;
    private long servicesOverdue;
    private long servicesDueNext30Days;
    private long licensesExpiringNext30Days;
    private long insuranceExpiringNext30Days;

    private long workOrdersScheduled;
    private long workOrdersInProgress;
    private long workOrdersAwaitingParts;
    private BigDecimal maintenanceCostThisMonth;

    private List<ServiceDue> upcomingServices;
    private List<WorkOrderSummary> activeWorkOrders;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ServiceDue {
        private Long vehicleId;
        private String registrationNumber;
        private String make;
        private String model;
        private VehicleStatus status;
        private LocalDate nextServiceDate;
        private long daysUntilDue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkOrderSummary {
        private Long id;
        private String workOrderNumber;
        private String vehicleRegistration;
        private MaintenanceType type;
        private WorkOrderStatus status;
        private String description;
        private LocalDate scheduledDate;
    }
}
