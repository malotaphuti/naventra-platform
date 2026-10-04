package com.fleetops.dto.trip;

import com.fleetops.entity.enums.TripStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripResponse {

    private Long id;
    private String tripNumber;
    private Long vehicleId;
    private String vehicleRegistration;
    private Long driverId;
    private String driverName;
    private TripStatus status;
    private String origin;
    private String destination;
    private String purpose;
    private Integer passengers;
    private String cargo;
    private LocalDateTime requestedAt;
    private LocalDateTime approvedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime closedAt;
    private Long startMileageKm;
    private Long endMileageKm;
    private Long distanceKm;
    private String rejectionReason;
    /** Reason given when the trip was cancelled. */
    private String reviewNotes;
    private String vehicleMake;
    private String vehicleModel;
    private String approvedByName;
}
