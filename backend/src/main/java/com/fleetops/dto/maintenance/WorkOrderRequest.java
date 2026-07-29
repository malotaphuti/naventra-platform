package com.fleetops.dto.maintenance;

import com.fleetops.entity.enums.MaintenanceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderRequest {

    @NotNull(message = "Vehicle ID is required")
    private Long vehicleId;

    @NotNull(message = "Maintenance type is required")
    private MaintenanceType type;

    @NotBlank(message = "Description is required")
    private String description;

    private String serviceType;
    private String workshop;
    private String mechanicName;
    private LocalDate scheduledDate;
    private BigDecimal labourCost;
    private BigDecimal partsCost;
}
