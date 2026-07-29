package com.fleetops.entity;

import com.fleetops.entity.enums.MaintenanceType;
import com.fleetops.entity.enums.WorkOrderStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "work_orders")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrder extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 20)
    private String workOrderNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MaintenanceType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private WorkOrderStatus status = WorkOrderStatus.SCHEDULED;

    @Column(nullable = false)
    private String description;

    private String serviceType;

    private String workshop;

    private String mechanicName;

    private LocalDate scheduledDate;

    private LocalDate startedDate;

    private LocalDate completedDate;

    private BigDecimal labourCost;

    private BigDecimal partsCost;

    private BigDecimal totalCost;

    private String invoiceNumber;

    private String invoiceUrl;

    private String partsUsed;

    private String notes;

    private LocalDate nextServiceDate;

    private Long nextServiceMileageKm;

    @Builder.Default
    private boolean deleted = false;
}
