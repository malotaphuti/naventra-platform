package com.fleetops.dto.maintenance;

import com.fleetops.entity.enums.MaintenanceType;
import com.fleetops.entity.enums.WorkOrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderResponse {

    private Long id;
    private String workOrderNumber;
    private Long vehicleId;
    private String vehicleRegistration;
    private MaintenanceType type;
    private WorkOrderStatus status;
    private String description;
    private String serviceType;
    private String workshop;
    private String mechanicName;
    private LocalDate scheduledDate;
    private LocalDate completedDate;
    private BigDecimal labourCost;
    private BigDecimal partsCost;
    private BigDecimal totalCost;
}
