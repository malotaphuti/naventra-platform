package com.fleetops.controller;

import com.fleetops.dto.incident.IncidentCreateRequest;
import com.fleetops.dto.incident.IncidentResponse;
import com.fleetops.entity.enums.IncidentStatus;
import com.fleetops.service.IncidentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/incidents")
@RequiredArgsConstructor
@Tag(name = "Incident Management", description = "Incident reporting and resolution")
public class IncidentController {

    private final IncidentService incidentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'DRIVER')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Report an incident")
    public IncidentResponse reportIncident(@Valid @RequestBody IncidentCreateRequest request) {
        return incidentService.reportIncident(request);
    }

    @PutMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'MAINTENANCE_OFFICER')")
    @Operation(summary = "Resolve an incident")
    public IncidentResponse resolveIncident(
            @PathVariable Long id,
            @RequestParam(required = false) String notes) {
        return incidentService.resolveIncident(id, notes);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER')")
    @Operation(summary = "Search incidents")
    public Page<IncidentResponse> searchIncidents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) IncidentStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return incidentService.searchIncidents(search, status, pageable);
    }
}
