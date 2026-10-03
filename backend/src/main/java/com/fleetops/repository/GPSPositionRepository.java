package com.fleetops.repository;

import com.fleetops.entity.GPSPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GPSPositionRepository extends JpaRepository<GPSPosition, Long> {

    @Query("SELECT p FROM GPSPosition p WHERE p.id IN " +
           "(SELECT MAX(p2.id) FROM GPSPosition p2 GROUP BY p2.vehicle.id)")
    List<GPSPosition> findLatestPerVehicle();

    Optional<GPSPosition> findTopByVehicleIdOrderByRecordedAtDescIdDesc(Long vehicleId);

    List<GPSPosition> findByTripIdOrderByRecordedAtAscIdAsc(Long tripId);
}
