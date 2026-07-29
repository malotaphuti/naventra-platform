package com.fleetops.config;

import com.fleetops.entity.Driver;
import com.fleetops.entity.User;
import com.fleetops.entity.Vehicle;
import com.fleetops.entity.enums.*;
import com.fleetops.repository.DriverRepository;
import com.fleetops.repository.UserRepository;
import com.fleetops.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

@Slf4j
@Component
@Profile("demo")
@RequiredArgsConstructor
public class DemoDataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        log.info("=== Initializing FleetOps Demo Data ===");

        // Create users
        User admin = createUser("admin", "Admin@123", "admin@fleetops.co.za", "System Administrator", UserRole.SYSTEM_ADMIN);
        User manager = createUser("fleet.manager", "Manager@123", "manager@fleetops.co.za", "John Mokoena", UserRole.FLEET_MANAGER);
        User driver1User = createUser("driver1", "Driver@123", "driver1@fleetops.co.za", "Sipho Ndaba", UserRole.DRIVER);
        User driver2User = createUser("driver2", "Driver@123", "driver2@fleetops.co.za", "Thabo Molefe", UserRole.DRIVER);
        User maintenance = createUser("maintenance", "Maint@123", "maint@fleetops.co.za", "Pieter van der Merwe", UserRole.MAINTENANCE_OFFICER);
        User exec = createUser("executive", "Exec@123", "exec@fleetops.co.za", "Nomsa Dlamini", UserRole.EXECUTIVE);

        // Create vehicles
        Vehicle v1 = createVehicle("GP 123 ABC", "Toyota", "Hilux", 2022, "White", "Diesel", 45230L, VehicleStatus.AVAILABLE);
        Vehicle v2 = createVehicle("GP 456 DEF", "Ford", "Ranger", 2023, "Silver", "Diesel", 28100L, VehicleStatus.AVAILABLE);
        Vehicle v3 = createVehicle("GP 789 GHI", "Volkswagen", "Amarok", 2021, "Black", "Diesel", 67890L, VehicleStatus.ON_TRIP);
        Vehicle v4 = createVehicle("GP 101 JKL", "Isuzu", "D-Max", 2023, "Grey", "Diesel", 12500L, VehicleStatus.MAINTENANCE);
        Vehicle v5 = createVehicle("GP 202 MNO", "Toyota", "Corolla", 2022, "Blue", "Petrol", 34200L, VehicleStatus.AVAILABLE);
        Vehicle v6 = createVehicle("GP 303 PQR", "Hyundai", "H100", 2020, "White", "Diesel", 89000L, VehicleStatus.AVAILABLE);
        Vehicle v7 = createVehicle("GP 404 STU", "Mercedes", "Vito", 2023, "Silver", "Diesel", 15600L, VehicleStatus.RESERVED);
        Vehicle v8 = createVehicle("GP 505 VWX", "Nissan", "NP200", 2019, "Red", "Petrol", 112000L, VehicleStatus.OUT_OF_SERVICE);

        // Create drivers
        Driver d1 = createDriver(driver1User, "EMP001", "DRV12345678", LicenseClass.C1, DriverStatus.ACTIVE);
        Driver d2 = createDriver(driver2User, "EMP002", "DRV87654321", LicenseClass.EC, DriverStatus.ON_TRIP);

        log.info("=== Demo Data Initialized ===");
        log.info("Login with: admin / Admin@123 (System Admin)");
        log.info("           fleet.manager / Manager@123 (Fleet Manager)");
        log.info("           driver1 / Driver@123 (Driver)");
        log.info("           executive / Exec@123 (Executive)");
    }

    private User createUser(String username, String password, String email, String fullName, UserRole role) {
        User user = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(password))
                .email(email)
                .fullName(fullName)
                .role(role)
                .enabled(true)
                .emailVerified(true)
                .build();
        return userRepository.save(user);
    }

    private Vehicle createVehicle(String reg, String make, String model, int year, String color,
                                  String fuelType, Long odometer, VehicleStatus status) {
        Vehicle vehicle = Vehicle.builder()
                .registrationNumber(reg)
                .make(make)
                .model(model)
                .year(year)
                .color(color)
                .fuelType(fuelType)
                .currentOdometerKm(odometer)
                .status(status)
                .licenseExpiryDate(LocalDate.now().plusMonths(6))
                .insuranceExpiryDate(LocalDate.now().plusMonths(4))
                .purchaseCost(new BigDecimal("450000"))
                .nextServiceDate(LocalDate.now().plusDays(30))
                .build();
        return vehicleRepository.save(vehicle);
    }

    private Driver createDriver(User user, String empNum, String licenseNum,
                                LicenseClass licClass, DriverStatus status) {
        Driver driver = Driver.builder()
                .user(user)
                .employeeNumber(empNum)
                .licenseNumber(licenseNum)
                .licenseClass(licClass)
                .licenseExpiryDate(LocalDate.now().plusYears(2))
                .medicalCertificateExpiry(LocalDate.now().plusYears(1))
                .contactNumber("0812345678")
                .emergencyContactName("Emergency Contact")
                .emergencyContactNumber("0829876543")
                .status(status)
                .build();
        return driverRepository.save(driver);
    }
}
