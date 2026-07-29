package com.fleetops.dto.incident;

import com.fleetops.entity.enums.IncidentSeverity;
import com.fleetops.entity.enums.IncidentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IncidentCreateRequest {

    @NotNull(message = "Vehicle ID is required")
    private Long vehicleId;

    @NotNull(message = "Driver ID is required")
    private Long driverId;

    private Long tripId;

    @NotNull(message = "Incident type is required")
    private IncidentType type;

    @NotNull(message = "Severity is required")
    private IncidentSeverity severity;

    @NotBlank(message = "Description is required")
    private String description;

    private String location;

    private LocalDateTime occurredAt;
}
