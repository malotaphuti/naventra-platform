package com.fleetops.dto.driver;

import com.fleetops.entity.enums.LicenseClass;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DriverCreateRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotBlank(message = "Employee number is required")
    @Size(max = 20)
    private String employeeNumber;

    @NotBlank(message = "License number is required")
    @Size(max = 30)
    private String licenseNumber;

    private LicenseClass licenseClass;

    @NotNull(message = "License expiry date is required")
    @Future(message = "License expiry must be in the future")
    private LocalDate licenseExpiryDate;

    private LocalDate medicalCertificateExpiry;

    @Size(max = 20)
    private String contactNumber;

    private String emergencyContactName;

    @Size(max = 20)
    private String emergencyContactNumber;
}
