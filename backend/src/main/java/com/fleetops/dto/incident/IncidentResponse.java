package com.fleetops.dto.incident;

import com.fleetops.entity.enums.IncidentSeverity;
import com.fleetops.entity.enums.IncidentStatus;
import com.fleetops.entity.enums.IncidentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentResponse {

    private Long id;
    private String incidentNumber;
    private Long vehicleId;
    private String vehicleRegistration;
    private Long driverId;
    private String driverName;
    private IncidentType type;
    private IncidentStatus status;
    private IncidentSeverity severity;
    private String description;
    private String location;
    private LocalDateTime occurredAt;
    private String resolutionNotes;
}
