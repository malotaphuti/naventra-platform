package com.fleetops.service;

import com.fleetops.entity.Driver;
import com.fleetops.entity.Trip;
import com.fleetops.entity.enums.TripStatus;
import com.fleetops.exception.EntityNotFoundException;
import com.fleetops.repository.DriverRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Optional;

/**
 * Decides which vehicle a DRIVER may log fuel or report incidents against:
 * their assigned vehicle, or the vehicle of the trip they currently have in progress.
 */
@Service
@RequiredArgsConstructor
public class DriverVehicleAccessService {

    private final DriverRepository driverRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public Optional<Trip> findActiveTrip(Long driverId) {
        return entityManager.createQuery(
                        "SELECT t FROM Trip t WHERE t.driver.id = :driverId AND t.status = :status " +
                        "AND t.deleted = false ORDER BY t.startedAt DESC", Trip.class)
                .setParameter("driverId", driverId)
                .setParameter("status", TripStatus.IN_PROGRESS)
                .setMaxResults(1)
                .getResultStream()
                .findFirst();
    }

    @Transactional(readOnly = true)
    public void assertDriverCanUseVehicle(Long driverId, Long vehicleId, String deniedMessage) {
        Driver driver = driverRepository.findByIdAndDeletedFalse(driverId)
                .orElseThrow(() -> new EntityNotFoundException("Driver", driverId));
        if (Objects.equals(driver.getAssignedVehicleId(), vehicleId)) {
            return;
        }
        boolean onActiveTrip = findActiveTrip(driverId)
                .map(trip -> trip.getVehicle().getId().equals(vehicleId))
                .orElse(false);
        if (!onActiveTrip) {
            throw new AccessDeniedException(deniedMessage);
        }
    }
}
