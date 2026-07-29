package com.fleetops.repository;

import com.fleetops.entity.Incident;
import com.fleetops.entity.enums.IncidentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long>, JpaSpecificationExecutor<Incident> {

    Optional<Incident> findByIdAndDeletedFalse(Long id);

    List<Incident> findByStatusAndDeletedFalse(IncidentStatus status);

    List<Incident> findByVehicleIdAndDeletedFalse(Long vehicleId);

    List<Incident> findByDriverIdAndDeletedFalse(Long driverId);

    long countByStatusAndDeletedFalse(IncidentStatus status);
}
