package com.fleetops.controller;

import com.fleetops.dto.driver.DriverCreateRequest;
import com.fleetops.dto.driver.DriverResponse;
import com.fleetops.entity.enums.DriverStatus;
import com.fleetops.service.DriverService;
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

import java.util.List;

@RestController
@RequestMapping("/v1/drivers")
@RequiredArgsConstructor
@Tag(name = "Driver Management", description = "Driver lifecycle operations")
public class DriverController {

    private final DriverService driverService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new driver")
    public DriverResponse register(@Valid @RequestBody DriverCreateRequest request) {
        return driverService.registerDriver(request);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @Operation(summary = "Get driver by ID")
    public DriverResponse getDriver(@PathVariable Long id) {
        return driverService.getDriver(id);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @Operation(summary = "Search drivers")
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
