package com.fleetops.controller;

import com.fleetops.dto.maintenance.WorkOrderRequest;
import com.fleetops.dto.maintenance.WorkOrderResponse;
import com.fleetops.entity.enums.WorkOrderStatus;
import com.fleetops.service.MaintenanceService;
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
@RequestMapping("/v1/maintenance")
@RequiredArgsConstructor
@Tag(name = "Maintenance Management", description = "Work order lifecycle")
public class MaintenanceController {

    private final MaintenanceService maintenanceService;

    @PostMapping
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'MAINTENANCE_OFFICER')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a work order")
    public WorkOrderResponse createWorkOrder(@Valid @RequestBody WorkOrderRequest request) {
        return maintenanceService.createWorkOrder(request);
    }

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'MAINTENANCE_OFFICER')")
    @Operation(summary = "Complete a work order")
    public WorkOrderResponse completeWorkOrder(@PathVariable Long id) {
        return maintenanceService.completeWorkOrder(id);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_OFFICER')")
    @Operation(summary = "Get work order by ID")
    public WorkOrderResponse getWorkOrder(@PathVariable Long id) {
        return maintenanceService.getWorkOrder(id);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_OFFICER')")
    @Operation(summary = "Search work orders")
    public Page<WorkOrderResponse> searchWorkOrders(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) WorkOrderStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return maintenanceService.searchWorkOrders(search, status, pageable);
    }
}
