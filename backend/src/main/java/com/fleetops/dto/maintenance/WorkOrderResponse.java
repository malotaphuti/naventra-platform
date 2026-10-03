package com.fleetops.dto.maintenance;

import com.fleetops.entity.enums.MaintenanceType;
import com.fleetops.entity.enums.VehicleStatus;
import com.fleetops.entity.enums.WorkOrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderResponse {

    private Long id;
    private String workOrderNumber;
    private Long vehicleId;
    private String vehicleRegistration;
    private String vehicleMake;
    private String vehicleModel;
    private VehicleStatus vehicleStatus;
    private Long vehicleOdometerKm;
    private MaintenanceType type;
    private WorkOrderStatus status;
    private String description;
    private String serviceType;
    private String workshop;
    private String mechanicName;
    private LocalDate scheduledDate;
    private LocalDate startedDate;
    private LocalDate completedDate;
    private BigDecimal labourCost;
    private BigDecimal partsCost;
    private BigDecimal totalCost;
    private String invoiceNumber;
    private String invoiceUrl;
    private String partsUsed;
    private String notes;
    private LocalDate nextServiceDate;
    private Long nextServiceMileageKm;
    private LocalDateTime createdAt;
    private String createdBy;
}
