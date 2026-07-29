package com.fleetops.repository;

import com.fleetops.entity.Driver;
import com.fleetops.entity.enums.DriverStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DriverRepository extends JpaRepository<Driver, Long>, JpaSpecificationExecutor<Driver> {

    Optional<Driver> findByIdAndDeletedFalse(Long id);

    Optional<Driver> findByUserIdAndDeletedFalse(Long userId);

    Optional<Driver> findByEmployeeNumberAndDeletedFalse(String employeeNumber);

    List<Driver> findByStatusAndDeletedFalse(DriverStatus status);

    List<Driver> findByLicenseExpiryDateBeforeAndDeletedFalse(LocalDate date);

    List<Driver> findByMedicalCertificateExpiryBeforeAndDeletedFalse(LocalDate date);

    boolean existsByEmployeeNumber(String employeeNumber);

    long countByStatusAndDeletedFalse(DriverStatus status);

    long countByDeletedFalse();
}
