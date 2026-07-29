package com.fleetops.dto.driver;

import com.fleetops.entity.enums.DriverStatus;
import com.fleetops.entity.enums.LicenseClass;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverResponse {

    private Long id;
    private Long userId;
    private String fullName;
    private String email;
    private String employeeNumber;
    private String licenseNumber;
    private LicenseClass licenseClass;
    private LocalDate licenseExpiryDate;
    private LocalDate medicalCertificateExpiry;
    private String contactNumber;
    private String emergencyContactName;
    private String emergencyContactNumber;
    private DriverStatus status;
    private Long assignedVehicleId;
}
