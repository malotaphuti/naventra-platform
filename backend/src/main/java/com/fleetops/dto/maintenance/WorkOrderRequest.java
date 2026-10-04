package com.fleetops.dto.maintenance;

import com.fleetops.entity.enums.MaintenanceType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class WorkOrderRequest {

    @NotNull(message = "Vehicle ID is required")
    private Long vehicleId;

    @NotNull(message = "Maintenance type is required")
    private MaintenanceType type;

    @NotBlank(message = "Description is required")
    @Size(max = 2000, message = "Description must be at most 2000 characters")
    private String description;

    @Size(max = 50, message = "Service type must be at most 50 characters")
    private String serviceType;

    @Size(max = 100, message = "Workshop must be at most 100 characters")
    private String workshop;

    @Size(max = 100, message = "Mechanic name must be at most 100 characters")
    private String mechanicName;

    private LocalDate scheduledDate;

    @DecimalMin(value = "0.00", message = "Labour cost cannot be negative")
    private BigDecimal labourCost;

    @DecimalMin(value = "0.00", message = "Parts cost cannot be negative")
    private BigDecimal partsCost;
}
