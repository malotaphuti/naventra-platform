package com.fleetops.dto.fuel;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FuelEntryResponse {

    private Long id;
    private Long vehicleId;
    private String vehicleRegistration;
    private Long driverId;
    private String driverName;
    private Long tripId;
    private LocalDateTime filledAt;
    private String fuelType;
    private Double litres;
    private BigDecimal costPerLitre;
    private BigDecimal totalCost;
    private Long odometerReadingKm;
    private String station;
    private String notes;
    private String receiptUrl;
}
