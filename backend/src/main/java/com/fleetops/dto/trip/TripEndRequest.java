package com.fleetops.dto.trip;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TripEndRequest {

    @NotNull(message = "End mileage is required")
    @Min(value = 1, message = "End mileage must be positive")
    private Long endMileageKm;
}
