package com.fleetops.dto.vehicle;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Every editable vehicle field except the registration number. Null fields are left unchanged. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VehicleUpdateRequest {

    @Size(max = 17, message = "VIN must not exceed 17 characters")
    private String vin;

    @Size(max = 30)
    private String engineNumber;

    @Size(max = 30)
    private String chassisNumber;

    @Size(max = 50)
    private String make;

    @Size(max = 50)
    private String model;

    @Size(max = 50)
    private String variant;

    @Min(value = 1900, message = "Year must be 1900 or later")
    @Max(value = 2100, message = "Year must not exceed 2100")
    private Integer year;

    @Size(max = 30)
    private String color;

    @Size(max = 30)
    private String fuelType;

    @Min(0)
    private Integer seatingCapacity;

    @Min(0)
    private Integer engineCapacityCc;

    private LocalDate purchaseDate;

    @DecimalMin(value = "0.0", message = "Purchase cost must be non-negative")
    private BigDecimal purchaseCost;

    @Size(max = 50)
    private String insuranceProvider;

    @Size(max = 50)
    private String insurancePolicyNumber;

    private LocalDate insuranceExpiryDate;

    private LocalDate licenseExpiryDate;

    @Min(value = 0, message = "Odometer must be non-negative")
    private Long currentOdometerKm;

    private LocalDate nextServiceDate;

    @Min(0)
    private Long nextServiceMileageKm;
}
