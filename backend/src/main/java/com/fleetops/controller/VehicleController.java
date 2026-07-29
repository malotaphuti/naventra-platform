package com.fleetops.controller;

import com.fleetops.dto.vehicle.VehicleCreateRequest;
import com.fleetops.dto.vehicle.VehicleResponse;
import com.fleetops.dto.vehicle.VehicleUpdateRequest;
import com.fleetops.entity.enums.VehicleStatus;
import com.fleetops.service.VehicleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/vehicles")
@RequiredArgsConstructor
@Tag(name = "Vehicle Management", description = "Vehicle lifecycle management endpoints")
public class VehicleController {

    private final VehicleService vehicleService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new vehicle")
    public VehicleResponse registerVehicle(@Valid @RequestBody VehicleCreateRequest request) {
        return vehicleService.registerVehicle(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @Operation(summary = "Update vehicle details")
    public VehicleResponse updateVehicle(
            @PathVariable Long id,
            @RequestBody VehicleUpdateRequest request) {
        return vehicleService.updateVehicle(id, request);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER', 'MAINTENANCE_OFFICER', 'EXECUTIVE')")
    @Operation(summary = "Get vehicle by ID")
    public VehicleResponse getVehicle(@PathVariable Long id) {
        return vehicleService.getVehicle(id);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER', 'MAINTENANCE_OFFICER', 'EXECUTIVE')")
    @Operation(summary = "Search vehicles with filters")
    public Page<VehicleResponse> searchVehicles(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) VehicleStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return vehicleService.searchVehicles(search, status, pageable);
    }

    @GetMapping("/available")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @Operation(summary = "Get all available vehicles")
    public List<VehicleResponse> getAvailableVehicles() {
        return vehicleService.getAvailableVehicles();
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_OFFICER')")
    @Operation(summary = "Transition vehicle status")
    public ResponseEntity<Void> transitionStatus(
            @PathVariable Long id,
            @RequestParam VehicleStatus status,
            @RequestParam(required = false) String reason) {
        vehicleService.transitionStatus(id, status, reason);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @Operation(summary = "Soft delete a vehicle")
    public ResponseEntity<Void> deleteVehicle(@PathVariable Long id) {
        vehicleService.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}
