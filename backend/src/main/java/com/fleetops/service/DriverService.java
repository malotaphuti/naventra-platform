package com.fleetops.service;

import com.fleetops.dto.driver.*;
import com.fleetops.entity.Driver;
import com.fleetops.entity.User;
import com.fleetops.entity.Vehicle;
import com.fleetops.entity.enums.DriverStatus;
import com.fleetops.entity.enums.TripStatus;
import com.fleetops.entity.enums.UserRole;
import com.fleetops.entity.enums.VehicleStatus;
import com.fleetops.exception.BusinessRuleException;
import com.fleetops.exception.EntityNotFoundException;
import com.fleetops.repository.DriverRepository;
import com.fleetops.repository.UserRepository;
import com.fleetops.repository.VehicleRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Join;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriverService {

    private static final EnumSet<TripStatus> OPEN_TRIP_STATUSES = EnumSet.of(
            TripStatus.REQUESTED, TripStatus.APPROVED, TripStatus.ALLOCATED, TripStatus.IN_PROGRESS);

    private final DriverRepository driverRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final CredentialService credentialService;
    private final EntityManager entityManager;

    @Transactional
    public DriverResponse registerDriver(DriverCreateRequest request) {
        boolean linkExisting = request.getUserId() != null;
        boolean createLogin = request.getNewUser() != null;
        if (linkExisting == createLogin) {
            throw new BusinessRuleException("Provide either an existing user or a new login account, not both");
        }
        if (driverRepository.existsByEmployeeNumber(request.getEmployeeNumber().trim())) {
            throw new BusinessRuleException("Employee number '" + request.getEmployeeNumber() + "' already exists");
        }

        String temporaryPassword = null;
        User user;
        if (linkExisting) {
            user = loadEligibleUser(request.getUserId());
        } else {
            user = newDriverLogin(request.getNewUser());
            temporaryPassword = credentialService.issueTemporaryPassword(user);
            user = userRepository.save(user);
        }

        Driver driver = Driver.builder()
                .user(user)
                .employeeNumber(request.getEmployeeNumber().trim())
                .licenseNumber(request.getLicenseNumber().trim())
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
        DriverResponse response = mapToResponse(driver);
        if (temporaryPassword != null) {
            response.setCredentials(credentialService.deliver(user, temporaryPassword, false));
        }
        return response;
    }

    @Transactional(readOnly = true)
    public List<EligibleUserResponse> getEligibleUsers() {
        return userRepository.findWithoutDriverProfile(UserRole.DRIVER).stream()
                .map(u -> EligibleUserResponse.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .fullName(u.getFullName())
                        .email(u.getEmail())
                        .build())
                .toList();
    }

    @Transactional
    public DriverResponse updateDriver(Long id, DriverUpdateRequest request) {
        Driver driver = findDriver(id);

        if (StringUtils.hasText(request.getEmployeeNumber())
                && !request.getEmployeeNumber().trim().equals(driver.getEmployeeNumber())) {
            String employeeNumber = request.getEmployeeNumber().trim();
            if (driverRepository.existsByEmployeeNumber(employeeNumber)) {
                throw new BusinessRuleException("Employee number '" + employeeNumber + "' already exists");
            }
            driver.setEmployeeNumber(employeeNumber);
        }
        if (StringUtils.hasText(request.getFullName())) driver.getUser().setFullName(request.getFullName().trim());
        if (StringUtils.hasText(request.getLicenseNumber())) driver.setLicenseNumber(request.getLicenseNumber().trim());
        if (request.getLicenseClass() != null) driver.setLicenseClass(request.getLicenseClass());
        if (request.getLicenseExpiryDate() != null) driver.setLicenseExpiryDate(request.getLicenseExpiryDate());
        if (request.getMedicalCertificateExpiry() != null) driver.setMedicalCertificateExpiry(request.getMedicalCertificateExpiry());
        if (request.getContactNumber() != null) driver.setContactNumber(request.getContactNumber());
        if (request.getEmergencyContactName() != null) driver.setEmergencyContactName(request.getEmergencyContactName());
        if (request.getEmergencyContactNumber() != null) driver.setEmergencyContactNumber(request.getEmergencyContactNumber());

        return mapToResponse(driverRepository.save(driver));
    }

    /** Returns the previous status. */
    @Transactional
    public DriverStatus changeStatus(Long id, DriverStatus newStatus) {
        Driver driver = findDriver(id);
        DriverStatus current = driver.getStatus();

        if (current == DriverStatus.ON_TRIP) {
            throw new BusinessRuleException("Cannot change the status of a driver who is on a trip");
        }
        if (newStatus == DriverStatus.ON_TRIP) {
            throw new BusinessRuleException("ON_TRIP is set automatically when a trip starts");
        }
        if (current == newStatus) {
            return current;
        }

        driver.setStatus(newStatus);
        if (newStatus == DriverStatus.TERMINATED) {
            clearAssignment(driver);
        }
        driverRepository.save(driver);
        log.info("Driver {} status changed: {} -> {}", driver.getEmployeeNumber(), current, newStatus);
        return current;
    }

    @Transactional
    public DriverResponse assignVehicle(Long driverId, Long vehicleId) {
        Driver driver = findDriver(driverId);
        if (driver.getStatus() == DriverStatus.TERMINATED) {
            throw new BusinessRuleException("Cannot assign a vehicle to a terminated driver");
        }

        Vehicle vehicle = vehicleRepository.findByIdAndDeletedFalse(vehicleId)
                .orElseThrow(() -> new EntityNotFoundException("Vehicle", vehicleId));
        if (vehicle.getStatus() == VehicleStatus.RETIRED) {
            throw new BusinessRuleException("Cannot assign a retired vehicle");
        }
        if (vehicle.getAssignedDriverId() != null && !vehicle.getAssignedDriverId().equals(driver.getId())) {
            String other = driverRepository.findById(vehicle.getAssignedDriverId())
                    .map(d -> d.getUser().getFullName()).orElse("another driver");
            throw new BusinessRuleException("Vehicle " + vehicle.getRegistrationNumber()
                    + " is already assigned to " + other + ". Unassign it first.");
        }

        if (driver.getAssignedVehicleId() != null && !driver.getAssignedVehicleId().equals(vehicleId)) {
            vehicleRepository.findById(driver.getAssignedVehicleId()).ifPresent(previous -> {
                if (driver.getId().equals(previous.getAssignedDriverId())) {
                    previous.setAssignedDriverId(null);
                    vehicleRepository.save(previous);
                }
            });
        }

        driver.setAssignedVehicleId(vehicle.getId());
        vehicle.setAssignedDriverId(driver.getId());
        vehicleRepository.save(vehicle);
        driverRepository.save(driver);
        log.info("Vehicle {} assigned to driver {}", vehicle.getRegistrationNumber(), driver.getEmployeeNumber());
        return mapToResponse(driver);
    }

    @Transactional
    public DriverResponse unassignVehicle(Long driverId) {
        Driver driver = findDriver(driverId);
        clearAssignment(driver);
        driverRepository.save(driver);
        return mapToResponse(driver);
    }

    @Transactional
    public void softDelete(Long id) {
        Driver driver = findDriver(id);
        if (driver.getStatus() == DriverStatus.ON_TRIP) {
            throw new BusinessRuleException("Cannot delete a driver who is currently on a trip");
        }
        Long openTrips = entityManager.createQuery(
                        "SELECT COUNT(t) FROM Trip t WHERE t.driver.id = :id AND t.deleted = false "
                                + "AND t.status IN :statuses", Long.class)
                .setParameter("id", id)
                .setParameter("statuses", OPEN_TRIP_STATUSES)
                .getSingleResult();
        if (openTrips > 0) {
            throw new BusinessRuleException("Cannot delete a driver with " + openTrips
                    + " open trip(s). Complete or cancel them first.");
        }

        clearAssignment(driver);
        driver.setDeleted(true);
        driverRepository.save(driver);
        log.info("Driver soft deleted: {}", driver.getEmployeeNumber());
    }

    @Transactional(readOnly = true)
    public DriverResponse getDriver(Long id) {
        return mapToResponse(findDriver(id));
    }

    @Transactional(readOnly = true)
    public Page<DriverResponse> searchDrivers(String search, DriverStatus status, Pageable pageable) {
        Specification<Driver> spec = (root, query, cb) -> cb.equal(root.get("deleted"), false);

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (StringUtils.hasText(search)) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> {
                Join<Driver, User> user = root.join("user");
                return cb.or(
                        cb.like(cb.lower(root.get("employeeNumber")), pattern),
                        cb.like(cb.lower(root.get("licenseNumber")), pattern),
                        cb.like(cb.lower(user.get("fullName")), pattern)
                );
            });
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

    private Driver findDriver(Long id) {
        return driverRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new EntityNotFoundException("Driver", id));
    }

    private User loadEligibleUser(Long userId) {
        User user = userRepository.findById(userId)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new EntityNotFoundException("User", userId));
        if (user.getRole() != UserRole.DRIVER) {
            throw new BusinessRuleException("User '" + user.getUsername() + "' does not have the DRIVER role");
        }
        if (driverRepository.existsByUserIdAndDeletedFalse(userId)) {
            throw new BusinessRuleException("User '" + user.getUsername() + "' already has a driver profile");
        }
        return user;
    }

    /** Builds (does not save) the DRIVER login; the caller issues the temporary password and saves. */
    private User newDriverLogin(DriverUserRequest request) {
        String username = request.getUsername().trim();
        String email = request.getEmail().trim();
        if (userRepository.existsByUsername(username)) {
            throw new BusinessRuleException("Username '" + username + "' is already taken");
        }
        if (userRepository.existsByEmail(email)) {
            throw new BusinessRuleException("Email '" + email + "' is already in use");
        }
        return User.builder()
                .username(username)
                .email(email)
                .fullName(request.getFullName().trim())
                .role(UserRole.DRIVER)
                .enabled(true)
                .emailVerified(true)
                .build();
    }

    private void clearAssignment(Driver driver) {
        if (driver.getAssignedVehicleId() != null) {
            vehicleRepository.findById(driver.getAssignedVehicleId()).ifPresent(vehicle -> {
                if (driver.getId().equals(vehicle.getAssignedDriverId())) {
                    vehicle.setAssignedDriverId(null);
                    vehicleRepository.save(vehicle);
                }
            });
            driver.setAssignedVehicleId(null);
        }
        // Defensive: also release any vehicle that still points at this driver.
        vehicleRepository.findFirstByAssignedDriverIdAndDeletedFalse(driver.getId()).ifPresent(vehicle -> {
            vehicle.setAssignedDriverId(null);
            vehicleRepository.save(vehicle);
        });
    }

    private DriverResponse mapToResponse(Driver driver) {
        String registration = driver.getAssignedVehicleId() == null ? null
                : vehicleRepository.findById(driver.getAssignedVehicleId())
                        .map(Vehicle::getRegistrationNumber).orElse(null);
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
                .assignedVehicleRegistration(registration)
                .build();
    }
}
