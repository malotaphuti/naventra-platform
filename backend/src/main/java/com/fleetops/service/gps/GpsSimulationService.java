package com.fleetops.service.gps;

import com.fleetops.entity.GPSPosition;
import com.fleetops.entity.Trip;
import com.fleetops.entity.enums.TripStatus;
import com.fleetops.repository.GPSPositionRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Stands in for vehicle telematics: every tick, records a simulated position for
 * each in-progress trip. Parked vehicles are not recorded; their position is
 * derived on read in {@link GpsService}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GpsSimulationService {

    private final EntityManager entityManager;
    private final GPSPositionRepository gpsPositionRepository;

    @Scheduled(fixedDelay = 10000, initialDelay = 15000)
    @Transactional
    public void tick() {
        try {
            List<Trip> trips = entityManager.createQuery(
                            "SELECT t FROM Trip t JOIN FETCH t.vehicle WHERE t.status = :status AND t.deleted = false",
                            Trip.class)
                    .setParameter("status", TripStatus.IN_PROGRESS)
                    .getResultList();
            if (trips.isEmpty()) {
                return;
            }
            LocalDateTime now = LocalDateTime.now();
            List<GPSPosition> positions = trips.stream().map(trip -> {
                RouteSimulator.SimulatedPosition sim = RouteSimulator.simulate(trip, now);
                return GPSPosition.builder()
                        .vehicle(trip.getVehicle())
                        .trip(trip)
                        .latitude(sim.point().lat())
                        .longitude(sim.point().lng())
                        .speed(sim.speedKmh())
                        .heading(sim.headingDeg())
                        .recordedAt(now)
                        .build();
            }).toList();
            gpsPositionRepository.saveAll(positions);
        } catch (RuntimeException ex) {
            // A failed tick must not kill the scheduler thread; the next tick retries.
            log.warn("GPS simulation tick failed: {}", ex.getMessage());
        }
    }
}
