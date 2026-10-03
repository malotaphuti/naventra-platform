package com.fleetops.entity;

import com.fleetops.entity.enums.IncidentSeverity;
import com.fleetops.entity.enums.IncidentStatus;
import com.fleetops.entity.enums.IncidentType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "incidents")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Incident extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 20)
    private String incidentNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "driver_id", nullable = false)
    private Driver driver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id")
    private Trip trip;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private IncidentStatus status = IncidentStatus.REPORTED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentSeverity severity;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    private String location;

    private LocalDateTime occurredAt;

    private String imageUrls;

    @Column(columnDefinition = "TEXT")
    private String reviewNotes;

    @Column(columnDefinition = "TEXT")
    private String resolutionNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id")
    private WorkOrder workOrder;

    @Builder.Default
    private boolean deleted = false;
}
