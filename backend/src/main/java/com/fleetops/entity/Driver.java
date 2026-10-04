package com.fleetops.entity;

import com.fleetops.entity.enums.DriverStatus;
import com.fleetops.entity.enums.LicenseClass;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "drivers")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Driver extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(unique = true, nullable = false, length = 20)
    private String employeeNumber;

    @Column(nullable = false, length = 30)
    private String licenseNumber;

    @Enumerated(EnumType.STRING)
    private LicenseClass licenseClass;

    @Column(nullable = false)
    private LocalDate licenseExpiryDate;

    private LocalDate medicalCertificateExpiry;

    @Column(length = 20)
    private String contactNumber;

    private String emergencyContactName;

    @Column(length = 20)
    private String emergencyContactNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DriverStatus status = DriverStatus.ACTIVE;

    @Column(name = "assigned_vehicle_id")
    private Long assignedVehicleId;

    @Builder.Default
    private boolean deleted = false;
}
