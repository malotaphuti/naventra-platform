package com.fleetops.entity;

import com.fleetops.entity.enums.TripStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "trips")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Trip extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 20)
    private String tripNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "driver_id", nullable = false)
    private Driver driver;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TripStatus status = TripStatus.REQUESTED;

    @Column(nullable = false)
    private String origin;

    @Column(nullable = false)
    private String destination;

    private String purpose;

    private String route;

    private Integer passengers;

    private String cargo;

    private LocalDateTime requestedAt;

    private LocalDateTime approvedAt;

    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    private LocalDateTime closedAt;

    private Long startMileageKm;

    private Long endMileageKm;

    private Long distanceKm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_id")
    private User approvedBy;

    private String rejectionReason;

    private String reviewNotes;

    @Builder.Default
    private boolean deleted = false;
}
