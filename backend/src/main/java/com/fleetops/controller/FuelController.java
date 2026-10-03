package com.fleetops.controller;

import com.fleetops.dto.fuel.FuelEntryRequest;
import com.fleetops.dto.fuel.FuelEntryResponse;
import com.fleetops.dto.fuel.FuelSummaryResponse;
import com.fleetops.security.UserPrincipal;
import com.fleetops.service.FuelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/v1/fuel")
@RequiredArgsConstructor
@Tag(name = "Fuel Management", description = "Fuel entry recording and analytics")
public class FuelController {

    private final FuelService fuelService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Record a fuel entry (drivers log for themselves and their own vehicle)")
    public FuelEntryResponse recordFuelEntry(
            @Valid @RequestBody FuelEntryRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return fuelService.recordFuelEntry(request, principal);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER')")
    @Operation(summary = "Search fuel entries (drivers only see their own)")
    public Page<FuelEntryResponse> searchFuelEntries(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long vehicleId,
            @RequestParam(required = false) Long driverId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20, sort = "filledAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return fuelService.searchFuelEntries(search, vehicleId, driverId, from, to, pageable, principal);
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'EXECUTIVE', 'DRIVER')")
    @Operation(summary = "Fuel totals for a period (drivers get their own totals)")
    public FuelSummaryResponse getSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long vehicleId,
            @RequestParam(required = false) Long driverId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return fuelService.getSummary(from, to, vehicleId, driverId, principal);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'DRIVER')")
    @Operation(summary = "Get a fuel entry")
    public FuelEntryResponse getFuelEntry(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return fuelService.getFuelEntry(id, principal);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a fuel entry (soft delete)")
    public void deleteFuelEntry(@PathVariable Long id) {
        fuelService.deleteFuelEntry(id);
    }
}
