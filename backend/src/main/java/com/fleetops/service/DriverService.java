package com.fleetops.service;

import com.fleetops.dto.driver.DriverCreateRequest;
import com.fleetops.dto.driver.DriverResponse;
import com.fleetops.entity.Driver;
import com.fleetops.entity.User;
import com.fleetops.entity.enums.DriverStatus;
import com.fleetops.exception.BusinessRuleException;
import com.fleetops.exception.EntityNotFoundException;
import com.fleetops.repository.DriverRepository;
import com.fleetops.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriverService {

    private final DriverRepository driverRepository;
    private final UserRepository userRepository;

    @Transactional
    public DriverResponse registerDriver(DriverCreateRequest request) {
        if (driverRepository.existsByEmployeeNumber(request.getEmployeeNumber())) {
            throw new BusinessRuleException("Employee number already exists");
        }

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User", request.getUserId()));

        Driver driver = Driver.builder()
                .user(user)
                .employeeNumber(request.getEmployeeNumber())
                .licenseNumber(request.getLicenseNumber())
                .licenseClass(request.getLicenseClass())
                .licenseExpiryDate(request.getLicenseExpiryDate())
                .medicalCertificateExpiry(request.getMedicalCertificateExpiry())
                .contactNumber(request.getContactNumber())
                .emergencyContactName(request.getEmergencyContactName())
                .emergencyContactNumber(request.getEmergencyContactNumber())
                .status(DriverStatus.ACTIVE)
                .build();

        driver = driverRepository.save(driver);
        log.info("Driver registered: {} ({})", driver.getEmployeeNumber(), driver.getId());
        return mapToResponse(driver);
    }

    @Transactional(readOnly = true)
    public DriverResponse getDriver(Long id) {
        Driver driver = driverRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new EntityNotFoundException("Driver", id));
        return mapToResponse(driver);
    }

    @Transactional(readOnly = true)
    public Page<DriverResponse> searchDrivers(String search, DriverStatus status, Pageable pageable) {
        Specification<Driver> spec = (root, query, cb) -> cb.equal(root.get("deleted"), false);

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (StringUtils.hasText(search)) {
            String pattern = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("employeeNumber")), pattern),
                    cb.like(cb.lower(root.get("licenseNumber")), pattern)
            ));
        }

        return driverRepository.findAll(spec, pageable).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public boolean isEligibleForTrip(Long driverId) {
        Driver driver = driverRepository.findByIdAndDeletedFalse(driverId)
                .orElseThrow(() -> new EntityNotFoundException("Driver", driverId));

        if (driver.getLicenseExpiryDate().isBefore(LocalDate.now())) return false;
        if (driver.getMedicalCertificateExpiry() != null
                && driver.getMedicalCertificateExpiry().isBefore(LocalDate.now())) return false;
        return driver.getStatus() == DriverStatus.ACTIVE;
    }

    @Transactional(readOnly = true)
    public List<DriverResponse> getActiveDrivers() {
        return driverRepository.findByStatusAndDeletedFalse(DriverStatus.ACTIVE)
                .stream().map(this::mapToResponse).toList();
    }

    private DriverResponse mapToResponse(Driver driver) {
        return DriverResponse.builder()
                .id(driver.getId())
                .userId(driver.getUser().getId())
                .fullName(driver.getUser().getFullName())
                .email(driver.getUser().getEmail())
                .employeeNumber(driver.getEmployeeNumber())
                .licenseNumber(driver.getLicenseNumber())
                .licenseClass(driver.getLicenseClass())
                .licenseExpiryDate(driver.getLicenseExpiryDate())
                .medicalCertificateExpiry(driver.getMedicalCertificateExpiry())
                .contactNumber(driver.getContactNumber())
                .emergencyContactName(driver.getEmergencyContactName())
                .emergencyContactNumber(driver.getEmergencyContactNumber())
                .status(driver.getStatus())
                .assignedVehicleId(driver.getAssignedVehicleId())
                .build();
    }
}
