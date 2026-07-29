package com.fleetops.controller;

import com.fleetops.dto.trip.*;
import com.fleetops.entity.enums.TripStatus;
import com.fleetops.security.UserPrincipal;
import com.fleetops.service.TripService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/trips")
@RequiredArgsConstructor
@Tag(name = "Trip Management", description = "Trip lifecycle operations")
public class TripController {

    private final TripService tripService;

    @PostMapping
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'DRIVER')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new trip request")
    public TripResponse createTrip(
            @Valid @RequestBody TripCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return tripService.createTrip(request, principal.getUserId());
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('FLEET_MANAGER')")
    @Operation(summary = "Approve a trip request")
    public TripResponse approveTrip(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return tripService.approveTrip(id, principal.getUserId());
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('FLEET_MANAGER')")
    @Operation(summary = "Reject a trip request")
    public TripResponse rejectTrip(
            @PathVariable Long id,
            @RequestParam String reason,
            @AuthenticationPrincipal UserPrincipal principal) {
        return tripService.rejectTrip(id, principal.getUserId(), reason);
    }

    @PutMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'DRIVER')")
    @Operation(summary = "Start a trip")
    public TripResponse startTrip(
            @PathVariable Long id,
            @Valid @RequestBody TripStartRequest request) {
        return tripService.startTrip(id, request);
    }

    @PutMapping("/{id}/end")
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'DRIVER')")
    @Operation(summary = "End a trip")
    public TripResponse endTrip(
            @PathVariable Long id,
            @Valid @RequestBody TripEndRequest request) {
        return tripService.endTrip(id, request);
    }

    @PutMapping("/{id}/close")
    @PreAuthorize("hasRole('FLEET_MANAGER')")
    @Operation(summary = "Close a completed trip")
    public TripResponse closeTrip(@PathVariable Long id) {
        return tripService.closeTrip(id);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'DRIVER', 'EXECUTIVE')")
    @Operation(summary = "Get trip by ID")
    public TripResponse getTrip(@PathVariable Long id) {
        return tripService.getTrip(id);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'DRIVER', 'EXECUTIVE')")
    @Operation(summary = "Search trips with filters")
    public Page<TripResponse> searchTrips(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) TripStatus status,
            @RequestParam(required = false) Long driverId,
            @PageableDefault(size = 20) Pageable pageable) {
        return tripService.searchTrips(search, status, driverId, pageable);
    }
}
