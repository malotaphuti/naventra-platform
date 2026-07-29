package com.fleetops.controller;

import com.fleetops.dto.fuel.FuelEntryRequest;
import com.fleetops.dto.fuel.FuelEntryResponse;
import com.fleetops.service.FuelService;
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
@RequestMapping("/v1/fuel")
@RequiredArgsConstructor
@Tag(name = "Fuel Management", description = "Fuel entry recording and analytics")
public class FuelController {

    private final FuelService fuelService;

    @PostMapping
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'DRIVER')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Record a fuel entry")
    public FuelEntryResponse recordFuelEntry(@Valid @RequestBody FuelEntryRequest request) {
        return fuelService.recordFuelEntry(request);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER')")
    @Operation(summary = "Search fuel entries")
    public Page<FuelEntryResponse> searchFuelEntries(
            @RequestParam(required = false) Long vehicleId,
            @PageableDefault(size = 20) Pageable pageable) {
        return fuelService.searchFuelEntries(vehicleId, pageable);
    }
}
