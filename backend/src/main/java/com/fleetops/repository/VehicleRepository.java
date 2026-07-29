package com.fleetops.repository;

import com.fleetops.entity.Vehicle;
import com.fleetops.entity.enums.VehicleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long>, JpaSpecificationExecutor<Vehicle> {

    Optional<Vehicle> findByIdAndDeletedFalse(Long id);

    Optional<Vehicle> findByRegistrationNumberAndDeletedFalse(String registrationNumber);

    List<Vehicle> findByStatusAndDeletedFalse(VehicleStatus status);

    List<Vehicle> findByNextServiceDateBeforeAndDeletedFalse(LocalDate date);

    List<Vehicle> findByLicenseExpiryDateBeforeAndDeletedFalse(LocalDate date);

    List<Vehicle> findByInsuranceExpiryDateBeforeAndDeletedFalse(LocalDate date);

    boolean existsByRegistrationNumber(String registrationNumber);

    boolean existsByVin(String vin);

    long countByStatusAndDeletedFalse(VehicleStatus status);

    long countByDeletedFalse();
}
