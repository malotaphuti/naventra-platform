package com.fleetops.dto.driver;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fleetops.dto.admin.CredentialsDelivery;
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
    private String assignedVehicleRegistration;

    /** Only when registering a driver with a new login: how the temporary password was delivered. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private CredentialsDelivery credentials;
}
