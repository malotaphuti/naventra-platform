package com.fleetops.controller;

import com.fleetops.dto.incident.IncidentCreateRequest;
import com.fleetops.dto.incident.IncidentResponse;
import com.fleetops.dto.incident.IncidentWorkOrderRequest;
import com.fleetops.entity.enums.IncidentSeverity;
import com.fleetops.entity.enums.IncidentStatus;
import com.fleetops.security.UserPrincipal;
import com.fleetops.service.IncidentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/incidents")
@RequiredArgsConstructor
@Tag(name = "Incident Management", description = "Incident reporting and resolution")
public class IncidentController {

    private static final String HANDLERS = "hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_OFFICER')";
    private static final String VIEWERS = "hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_OFFICER', 'DRIVER')";

    private final IncidentService incidentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Report an incident (drivers report for themselves and their own vehicle)")
    public IncidentResponse reportIncident(
            @Valid @RequestBody IncidentCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return incidentService.reportIncident(request, principal);
    }

    @GetMapping
    @PreAuthorize(VIEWERS)
    @Operation(summary = "Search incidents (drivers only see their own)")
    public Page<IncidentResponse> searchIncidents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) IncidentStatus status,
            @RequestParam(required = false) IncidentSeverity severity,
            @RequestParam(required = false) Long vehicleId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return incidentService.searchIncidents(search, status, severity, vehicleId, pageable, principal);
    }

    @GetMapping("/{id}")
    @PreAuthorize(VIEWERS)
    @Operation(summary = "Get incident by ID")
    public IncidentResponse getIncident(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return incidentService.getIncident(id, principal);
    }

    @PutMapping("/{id}/review")
    @PreAuthorize(HANDLERS)
    @Operation(summary = "Start reviewing an incident (REPORTED -> UNDER_REVIEW)")
    public IncidentResponse reviewIncident(
            @PathVariable Long id,
            @RequestParam(required = false) String notes,
            @AuthenticationPrincipal UserPrincipal principal) {
        return incidentService.reviewIncident(id, notes, principal);
    }

    @PostMapping("/{id}/work-order")
    @PreAuthorize(HANDLERS)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Raise a work order for the incident's vehicle and link it (-> IN_MAINTENANCE)")
    public IncidentResponse createWorkOrder(
            @PathVariable Long id,
            @Valid @RequestBody IncidentWorkOrderRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return incidentService.createWorkOrder(id, request, principal);
    }

    @PutMapping("/{id}/resolve")
    @PreAuthorize(HANDLERS)
    @Operation(summary = "Resolve an incident")
    public IncidentResponse resolveIncident(@PathVariable Long id, @RequestParam String notes) {
        return incidentService.resolveIncident(id, notes);
    }

    @PutMapping("/{id}/close")
    @PreAuthorize(HANDLERS)
    @Operation(summary = "Close a resolved incident")
    public IncidentResponse closeIncident(@PathVariable Long id) {
        return incidentService.closeIncident(id);
    }
}
