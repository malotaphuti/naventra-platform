package com.fleetops.dto.incident;

import com.fleetops.entity.enums.MaintenanceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** Work order raised from an incident; the vehicle is taken from the incident. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IncidentWorkOrderRequest {

    @NotNull(message = "Maintenance type is required")
    private MaintenanceType type;

    @NotBlank(message = "Description is required")
    @Size(max = 2000, message = "Description must be at most 2000 characters")
    private String description;

    @Size(max = 50, message = "Service type must be at most 50 characters")
    private String serviceType;

    @Size(max = 100, message = "Workshop must be at most 100 characters")
    private String workshop;

    private LocalDate scheduledDate;
}
