package com.fleetops.dto.incident;

import com.fleetops.entity.enums.IncidentSeverity;
import com.fleetops.entity.enums.IncidentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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

    /** Ignored for DRIVER callers (always their own id); required for other roles. */
    private Long driverId;

    private Long tripId;

    @NotNull(message = "Incident type is required")
    private IncidentType type;

    @NotNull(message = "Severity is required")
    private IncidentSeverity severity;

    @NotBlank(message = "Description is required")
    @Size(max = 4000, message = "Description must be at most 4000 characters")
    private String description;

    @Size(max = 255, message = "Location must be at most 255 characters")
    private String location;

    private LocalDateTime occurredAt;
}
