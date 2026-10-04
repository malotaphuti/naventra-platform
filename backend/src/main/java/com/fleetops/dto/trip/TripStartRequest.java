package com.fleetops.dto.trip;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TripStartRequest {

    @NotNull(message = "Start mileage is required")
    @Min(value = 0, message = "Start mileage must be non-negative")
    private Long startMileageKm;
}
