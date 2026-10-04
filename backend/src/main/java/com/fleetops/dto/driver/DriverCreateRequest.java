package com.fleetops.dto.driver;

import com.fleetops.entity.enums.LicenseClass;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Either {@code userId} (link an existing DRIVER login) or {@code newUser} (create the login in the
 * same transaction) must be given, but not both.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DriverCreateRequest {

    private Long userId;

    @Valid
    private DriverUserRequest newUser;

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

    @Size(max = 100)
    private String emergencyContactName;

    @Size(max = 20)
    private String emergencyContactNumber;
}
