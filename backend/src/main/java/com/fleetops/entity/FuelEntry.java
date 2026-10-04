package com.fleetops.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "fuel_entries")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FuelEntry extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id")
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "driver_id", nullable = false)
    private Driver driver;

    @Column(nullable = false)
    private LocalDateTime filledAt;

    @Column(nullable = false)
    private String fuelType;

    @Column(nullable = false)
    private Double litres;

    @Column(nullable = false)
    private BigDecimal costPerLitre;

    @Column(nullable = false)
    private BigDecimal totalCost;

    @Column(nullable = false)
    private Long odometerReadingKm;

    private String station;

    private String receiptUrl;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    private boolean deleted = false;
}
