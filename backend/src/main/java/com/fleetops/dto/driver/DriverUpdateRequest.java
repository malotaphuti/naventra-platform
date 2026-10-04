package com.fleetops.dto.driver;

import com.fleetops.entity.enums.LicenseClass;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** Null fields are left unchanged. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DriverUpdateRequest {

    @Size(max = 100)
    private String fullName;

    @Size(max = 20)
    private String employeeNumber;

    @Size(max = 30)
    private String licenseNumber;

    private LicenseClass licenseClass;

    private LocalDate licenseExpiryDate;

    private LocalDate medicalCertificateExpiry;

    @Size(max = 20)
    private String contactNumber;

    @Size(max = 100)
    private String emergencyContactName;

    @Size(max = 20)
    private String emergencyContactNumber;
}
