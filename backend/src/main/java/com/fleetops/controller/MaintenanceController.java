package com.fleetops.controller;

import com.fleetops.dto.maintenance.WorkOrderCompleteRequest;
import com.fleetops.dto.maintenance.WorkOrderRequest;
import com.fleetops.dto.maintenance.WorkOrderResponse;
import com.fleetops.dto.maintenance.WorkOrderUpdateRequest;
import com.fleetops.entity.enums.MaintenanceType;
import com.fleetops.entity.enums.WorkOrderStatus;
import com.fleetops.service.MaintenanceService;
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
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/maintenance")
@RequiredArgsConstructor
@Tag(name = "Maintenance Management", description = "Work order lifecycle")
public class MaintenanceController {

    private static final String MAINTAINERS = "hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_OFFICER')";

    private final MaintenanceService maintenanceService;

    @PostMapping
    @PreAuthorize(MAINTAINERS)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a work order (future scheduled date = SCHEDULED, otherwise OPEN and vehicle to MAINTENANCE)")
    public WorkOrderResponse createWorkOrder(@Valid @RequestBody WorkOrderRequest request) {
        return maintenanceService.createWorkOrder(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize(MAINTAINERS)
    @Operation(summary = "Update work order details and costs")
    public WorkOrderResponse updateWorkOrder(@PathVariable Long id, @Valid @RequestBody WorkOrderUpdateRequest request) {
        return maintenanceService.updateWorkOrder(id, request);
    }

    @PutMapping("/{id}/start")
    @PreAuthorize(MAINTAINERS)
    @Operation(summary = "Start work (SCHEDULED/OPEN -> IN_PROGRESS)")
    public WorkOrderResponse startWorkOrder(@PathVariable Long id) {
        return maintenanceService.startWorkOrder(id);
    }

    @PutMapping("/{id}/awaiting-parts")
    @PreAuthorize(MAINTAINERS)
    @Operation(summary = "Mark work order as awaiting parts")
    public WorkOrderResponse markAwaitingParts(@PathVariable Long id) {
        return maintenanceService.markAwaitingParts(id);
    }

    @PutMapping("/{id}/resume")
    @PreAuthorize(MAINTAINERS)
    @Operation(summary = "Resume work after parts arrive (AWAITING_PARTS -> IN_PROGRESS)")
    public WorkOrderResponse resumeWorkOrder(@PathVariable Long id) {
        return maintenanceService.resumeWorkOrder(id);
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize(MAINTAINERS)
    @Operation(summary = "Cancel a work order")
    public WorkOrderResponse cancelWorkOrder(@PathVariable Long id, @RequestParam(required = false) String reason) {
        return maintenanceService.cancelWorkOrder(id, reason);
    }

    @PutMapping("/{id}/complete")
    @PreAuthorize(MAINTAINERS)
    @Operation(summary = "Complete a work order (optional body with final costs and next service)")
    public WorkOrderResponse completeWorkOrder(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) WorkOrderCompleteRequest request) {
        return maintenanceService.completeWorkOrder(id, request);
    }

    @GetMapping("/{id}")
    @PreAuthorize(MAINTAINERS)
    @Operation(summary = "Get work order by ID")
    public WorkOrderResponse getWorkOrder(@PathVariable Long id) {
        return maintenanceService.getWorkOrder(id);
    }

    @GetMapping
    @PreAuthorize(MAINTAINERS)
    @Operation(summary = "Search work orders")
    public Page<WorkOrderResponse> searchWorkOrders(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) WorkOrderStatus status,
            @RequestParam(required = false) Long vehicleId,
            @RequestParam(required = false) MaintenanceType type,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return maintenanceService.searchWorkOrders(search, status, vehicleId, type, pageable);
    }
}
