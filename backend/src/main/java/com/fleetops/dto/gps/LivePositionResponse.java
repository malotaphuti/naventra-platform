package com.fleetops.dto.gps;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LivePositionResponse {

    private Long vehicleId;
    private String registrationNumber;
    private String make;
    private String model;
    private String status;
    private String driverName;
    private Long tripId;
    private String tripNumber;
    private String origin;
    private String destination;
    private Double latitude;
    private Double longitude;
    private Double speedKmh;
    private Double headingDeg;
    private LocalDateTime recordedAt;
    /** Null when the vehicle is parked (not on an in-progress trip). */
    private Double progressPercent;
    private boolean moving;
}
