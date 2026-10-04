package com.fleetops.repository;

import com.fleetops.entity.Driver;
import com.fleetops.entity.Trip;
import com.fleetops.entity.Vehicle;
import com.fleetops.entity.enums.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long>, JpaSpecificationExecutor<Trip> {

    Optional<Trip> findByIdAndDeletedFalse(Long id);

    Optional<Trip> findByTripNumberAndDeletedFalse(String tripNumber);

    /** Highest trip number with the given prefix (includes deleted trips, since trip_number is unique). */
    Optional<Trip> findTopByTripNumberStartingWithOrderByTripNumberDesc(String prefix);

    boolean existsByDriverAndStatusInAndDeletedFalse(Driver driver, Collection<TripStatus> statuses);

    boolean existsByVehicleAndStatusInAndDeletedFalse(Vehicle vehicle, Collection<TripStatus> statuses);

    List<Trip> findByStatusAndDeletedFalse(TripStatus status);

    @Query("SELECT COUNT(t) FROM Trip t WHERE t.status = :status AND t.deleted = false")
    long countByStatus(@Param("status") TripStatus status);

    @Query("SELECT COUNT(t) FROM Trip t WHERE t.deleted = false AND t.startedAt >= :from AND t.startedAt < :to")
    long countTripsStartedBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT SUM(t.distanceKm) FROM Trip t WHERE t.deleted = false AND t.status = 'COMPLETED' " +
           "AND t.completedAt >= :from AND t.completedAt < :to")
    Long sumDistanceBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Driver dashboard

    List<Trip> findTop5ByDriverIdAndDeletedFalseOrderByIdDesc(Long driverId);

    Optional<Trip> findFirstByDriverIdAndStatusInAndDeletedFalseOrderByIdDesc(
            Long driverId, Collection<TripStatus> statuses);

    long countByDriverIdAndStatusAndDeletedFalse(Long driverId, TripStatus status);

    @Query("SELECT COUNT(t) FROM Trip t WHERE t.driver.id = :driverId AND t.deleted = false " +
           "AND t.requestedAt >= :from AND t.requestedAt < :to")
    long countByDriverRequestedBetween(@Param("driverId") Long driverId,
                                       @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COUNT(t) FROM Trip t WHERE t.driver.id = :driverId AND t.deleted = false " +
           "AND t.status IN ('COMPLETED', 'CLOSED') AND t.completedAt >= :from AND t.completedAt < :to")
    long countCompletedByDriverBetween(@Param("driverId") Long driverId,
                                       @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COALESCE(SUM(t.distanceKm), 0) FROM Trip t WHERE t.driver.id = :driverId AND t.deleted = false " +
           "AND t.status IN ('COMPLETED', 'CLOSED') AND t.completedAt >= :from AND t.completedAt < :to")
    Long sumDistanceByDriverBetween(@Param("driverId") Long driverId,
                                    @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
