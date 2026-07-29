package com.fleetops.dto.vehicle;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VehicleUpdateRequest {

    private String color;
    private String fuelType;
    private String insuranceProvider;
    private String insurancePolicyNumber;
    private LocalDate insuranceExpiryDate;
    private LocalDate licenseExpiryDate;
    private LocalDate nextServiceDate;
    private Long nextServiceMileageKm;
}
