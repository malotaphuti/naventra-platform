package com.fleetops.dto.vehicle;

import com.fleetops.entity.enums.VehicleStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleResponse {

    private Long id;
    private String registrationNumber;
    private String vin;
    private String engineNumber;
    private String chassisNumber;
    private String make;
    private String model;
    private String variant;
    private int year;
    private String color;
    private String fuelType;
    private int seatingCapacity;
    private int engineCapacityCc;
    private LocalDate purchaseDate;
    private BigDecimal purchaseCost;
    private String insuranceProvider;
    private String insurancePolicyNumber;
    private LocalDate insuranceExpiryDate;
    private LocalDate licenseExpiryDate;
    private Long currentOdometerKm;
    private VehicleStatus status;
    private Long assignedDriverId;
    private String assignedDriverName;
    private LocalDate nextServiceDate;
    private Long nextServiceMileageKm;
    private LocalDateTime createdAt;
}
