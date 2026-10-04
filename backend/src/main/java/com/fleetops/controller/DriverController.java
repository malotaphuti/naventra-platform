package com.fleetops.controller;

import com.fleetops.dto.driver.DriverCreateRequest;
import com.fleetops.dto.driver.DriverResponse;
import com.fleetops.dto.driver.DriverUpdateRequest;
import com.fleetops.dto.driver.EligibleUserResponse;
import com.fleetops.entity.enums.DriverStatus;
import com.fleetops.service.AuditService;
import com.fleetops.service.DriverService;
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
@RequestMapping("/v1/drivers")
@RequiredArgsConstructor
@Tag(name = "Driver Management", description = "Driver lifecycle operations")
public class DriverController {

    private final DriverService driverService;
    private final AuditService auditService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new driver (link an existing DRIVER user or create the login)")
    public DriverResponse register(@Valid @RequestBody DriverCreateRequest request) {
        return driverService.registerDriver(request);
    }

    @GetMapping("/eligible-users")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @Operation(summary = "Users with the DRIVER role that have no driver profile yet")
    public List<EligibleUserResponse> getEligibleUsers() {
        return driverService.getEligibleUsers();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @Operation(summary = "Get driver by ID")
    public DriverResponse getDriver(@PathVariable Long id) {
        return driverService.getDriver(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @Operation(summary = "Update driver profile")
    public DriverResponse updateDriver(@PathVariable Long id, @Valid @RequestBody DriverUpdateRequest request) {
        return driverService.updateDriver(id, request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @Operation(summary = "Change driver status")
    public DriverResponse changeStatus(@PathVariable Long id, @RequestParam DriverStatus status) {
        DriverStatus previous = driverService.changeStatus(id, status);
        auditService.annotate("STATUS_CHANGE", previous.name(), status.name());
        return driverService.getDriver(id);
    }

    @PutMapping("/{id}/vehicle")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @Operation(summary = "Assign a vehicle to the driver (replaces any previous assignment)")
    public DriverResponse assignVehicle(@PathVariable Long id, @RequestParam Long vehicleId) {
        DriverResponse response = driverService.assignVehicle(id, vehicleId);
        auditService.annotate("ASSIGN_VEHICLE", null, response.getAssignedVehicleRegistration());
        return response;
    }

    @DeleteMapping("/{id}/vehicle")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @Operation(summary = "Unassign the driver's vehicle")
    public DriverResponse unassignVehicle(@PathVariable Long id) {
        auditService.annotate("UNASSIGN_VEHICLE", driverService.getDriver(id).getAssignedVehicleRegistration(), null);
        return driverService.unassignVehicle(id);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @Operation(summary = "Soft delete a driver")
    public ResponseEntity<Void> deleteDriver(@PathVariable Long id) {
        driverService.softDelete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @Operation(summary = "Search drivers by name, employee number or licence number")
    public Page<DriverResponse> searchDrivers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) DriverStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return driverService.searchDrivers(search, status, pageable);
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @Operation(summary = "Get active drivers")
    public List<DriverResponse> getActiveDrivers() {
        return driverService.getActiveDrivers();
    }
}
