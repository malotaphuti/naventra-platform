package com.fleetops.dto.fuel;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FuelEntryRequest {

    @NotNull(message = "Vehicle ID is required")
    private Long vehicleId;

    /** Ignored for DRIVER callers (always their own id); required for other roles. */
    private Long driverId;

    private Long tripId;

    @NotNull(message = "Fill date/time is required")
    private LocalDateTime filledAt;

    @NotBlank(message = "Fuel type is required")
    @Size(max = 30, message = "Fuel type must be at most 30 characters")
    private String fuelType;

    @NotNull(message = "Litres is required")
    @DecimalMin(value = "0.1", message = "Litres must be positive")
    private Double litres;

    @NotNull(message = "Cost per litre is required")
    @DecimalMin(value = "0.01", message = "Cost per litre must be positive")
    private BigDecimal costPerLitre;

    @NotNull(message = "Odometer reading is required")
    @Min(value = 0, message = "Odometer must be non-negative")
    private Long odometerReadingKm;

    @Size(max = 100, message = "Station must be at most 100 characters")
    private String station;

    @Size(max = 2000, message = "Notes must be at most 2000 characters")
    private String notes;
}
