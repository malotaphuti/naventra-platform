package com.fleetops.dto.trip;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TripCreateRequest {

    @NotNull(message = "Vehicle ID is required")
    private Long vehicleId;

    /** Required for fleet managers; ignored for drivers, who can only request trips for themselves. */
    private Long driverId;

    @NotBlank(message = "Origin is required")
    private String origin;

    @NotBlank(message = "Destination is required")
    private String destination;

    private String purpose;

    private Integer passengers;

    private String cargo;
}
