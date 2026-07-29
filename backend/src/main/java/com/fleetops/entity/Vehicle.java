package com.fleetops.entity;

import com.fleetops.entity.enums.VehicleStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "vehicles")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Vehicle extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 20)
    private String registrationNumber;

    @Column(length = 17)
    private String vin;

    @Column(length = 30)
    private String engineNumber;

    @Column(length = 30)
    private String chassisNumber;

    @Column(nullable = false, length = 50)
    private String make;

    @Column(nullable = false, length = 50)
    private String model;

    @Column(length = 50)
    private String variant;

    @Column(name = "model_year", nullable = false)
    private int year;

    @Column(length = 30)
    private String color;

    @Column(length = 30)
    private String fuelType;

    private int seatingCapacity;

    private int engineCapacityCc;

    private LocalDate purchaseDate;

    private BigDecimal purchaseCost;

    @Column(length = 50)
    private String insuranceProvider;

    private String insurancePolicyNumber;

    private LocalDate insuranceExpiryDate;

    private LocalDate licenseExpiryDate;

    @Builder.Default
    private Long currentOdometerKm = 0L;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private VehicleStatus status = VehicleStatus.AVAILABLE;

    @Column(name = "assigned_driver_id")
    private Long assignedDriverId;

    private LocalDate nextServiceDate;

    private Long nextServiceMileageKm;

    @Builder.Default
    private boolean deleted = false;
}
