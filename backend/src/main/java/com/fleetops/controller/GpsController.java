package com.fleetops.controller;

import com.fleetops.dto.gps.LivePositionResponse;
import com.fleetops.dto.gps.PositionIngestRequest;
import com.fleetops.dto.gps.TripTrackResponse;
import com.fleetops.service.gps.GpsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/gps")
@RequiredArgsConstructor
@Tag(name = "GPS Tracking", description = "Live vehicle positions and trip tracks")
public class GpsController {

    private final GpsService gpsService;

    @GetMapping("/live")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'EXECUTIVE')")
    @Operation(summary = "Current position of every active vehicle")
    public List<LivePositionResponse> getLivePositions() {
        return gpsService.getLivePositions();
    }

    @GetMapping("/trips/{tripId}/track")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'EXECUTIVE')")
    @Operation(summary = "Recorded track of a trip with origin and destination coordinates")
    public TripTrackResponse getTripTrack(@PathVariable Long tripId) {
        return gpsService.getTripTrack(tripId);
    }

    @PostMapping("/positions")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Ingest a position reported by a tracking device")
    public void ingestPosition(@Valid @RequestBody PositionIngestRequest request) {
        gpsService.ingest(request);
    }
}
