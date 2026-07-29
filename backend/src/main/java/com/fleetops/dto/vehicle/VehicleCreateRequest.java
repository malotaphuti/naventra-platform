package com.fleetops.dto.vehicle;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VehicleCreateRequest {

    @NotBlank(message = "Registration number is required")
    @Size(max = 20, message = "Registration number must not exceed 20 characters")
    private String registrationNumber;

    @Size(min = 17, max = 17, message = "VIN must be exactly 17 characters")
    private String vin;

    @Size(max = 30)
    private String engineNumber;

    @Size(max = 30)
    private String chassisNumber;

    @NotBlank(message = "Make is required")
    @Size(max = 50)
    private String make;

    @NotBlank(message = "Model is required")
    @Size(max = 50)
    private String model;

    @Size(max = 50)
    private String variant;

    @NotNull(message = "Year is required")
    @Min(value = 1900, message = "Year must be 1900 or later")
    @Max(value = 2100, message = "Year must not exceed 2100")
    private Integer year;

    @Size(max = 30)
    private String color;

    @Size(max = 30)
    private String fuelType;

    private int seatingCapacity;

    private int engineCapacityCc;

    private LocalDate purchaseDate;

    @DecimalMin(value = "0.0", message = "Purchase cost must be non-negative")
    private BigDecimal purchaseCost;

    private String insuranceProvider;

    private String insurancePolicyNumber;

    private LocalDate insuranceExpiryDate;

    private LocalDate licenseExpiryDate;

    @Min(value = 0, message = "Odometer must be non-negative")
    private Long currentOdometerKm;

    private LocalDate nextServiceDate;

    private Long nextServiceMileageKm;
}
