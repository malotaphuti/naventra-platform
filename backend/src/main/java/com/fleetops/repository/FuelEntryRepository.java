package com.fleetops.repository;

import com.fleetops.entity.FuelEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FuelEntryRepository extends JpaRepository<FuelEntry, Long>, JpaSpecificationExecutor<FuelEntry> {

    Optional<FuelEntry> findByIdAndDeletedFalse(Long id);

    List<FuelEntry> findByVehicleIdAndFilledAtBetweenAndDeletedFalseOrderByFilledAt(
            Long vehicleId, LocalDateTime from, LocalDateTime to);

    @Query("SELECT MAX(f.odometerReadingKm) FROM FuelEntry f WHERE f.vehicle.id = :vehicleId AND f.deleted = false")
    Optional<Long> findMaxOdometerByVehicleId(@Param("vehicleId") Long vehicleId);

    @Query("SELECT COALESCE(SUM(f.totalCost), 0) FROM FuelEntry f WHERE f.deleted = false " +
           "AND f.filledAt >= :from AND f.filledAt < :to")
    BigDecimal sumTotalCostBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COALESCE(SUM(f.litres), 0) FROM FuelEntry f WHERE f.vehicle.id = :vehicleId " +
           "AND f.deleted = false AND f.filledAt >= :from AND f.filledAt < :to")
    Double sumLitresByVehicleBetween(
            @Param("vehicleId") Long vehicleId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
