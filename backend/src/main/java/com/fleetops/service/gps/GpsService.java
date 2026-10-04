package com.fleetops.service.gps;

import com.fleetops.dto.gps.LivePositionResponse;
import com.fleetops.dto.gps.PositionIngestRequest;
import com.fleetops.dto.gps.TripTrackResponse;
import com.fleetops.entity.Driver;
import com.fleetops.entity.GPSPosition;
import com.fleetops.entity.Trip;
import com.fleetops.entity.Vehicle;
import com.fleetops.entity.enums.TripStatus;
import com.fleetops.entity.enums.VehicleStatus;
import com.fleetops.exception.BusinessRuleException;
import com.fleetops.exception.EntityNotFoundException;
import com.fleetops.repository.GPSPositionRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GpsService {

    private final EntityManager entityManager;
    private final GPSPositionRepository gpsPositionRepository;

    @Transactional(readOnly = true)
    public List<LivePositionResponse> getLivePositions() {
        List<Vehicle> vehicles = entityManager.createQuery(
                        "SELECT v FROM Vehicle v WHERE v.deleted = false AND v.status <> :retired ORDER BY v.registrationNumber",
                        Vehicle.class)
                .setParameter("retired", VehicleStatus.RETIRED)
                .getResultList();

        Map<Long, Trip> activeTrips = entityManager.createQuery(
                        "SELECT t FROM Trip t JOIN FETCH t.driver d JOIN FETCH d.user " +
                        "WHERE t.status = :status AND t.deleted = false ORDER BY t.startedAt",
                        Trip.class)
                .setParameter("status", TripStatus.IN_PROGRESS)
                .getResultList().stream()
                .collect(Collectors.toMap(t -> t.getVehicle().getId(), Function.identity(), (a, b) -> b));

        Map<Long, Driver> drivers = entityManager.createQuery(
                        "SELECT d FROM Driver d JOIN FETCH d.user WHERE d.deleted = false", Driver.class)
                .getResultList().stream()
                .collect(Collectors.toMap(Driver::getId, Function.identity()));

        Map<Long, GPSPosition> latest = gpsPositionRepository.findLatestPerVehicle().stream()
                .collect(Collectors.toMap(p -> p.getVehicle().getId(), Function.identity(), (a, b) -> b));

        LocalDateTime now = LocalDateTime.now();
        return vehicles.stream()
                .map(v -> toLive(v, activeTrips.get(v.getId()), latest.get(v.getId()), drivers, now))
                .toList();
    }

    private LivePositionResponse toLive(Vehicle vehicle, Trip trip, GPSPosition last,
                                        Map<Long, Driver> drivers, LocalDateTime now) {
        LivePositionResponse.LivePositionResponseBuilder builder = LivePositionResponse.builder()
                .vehicleId(vehicle.getId())
                .registrationNumber(vehicle.getRegistrationNumber())
                .make(vehicle.getMake())
                .model(vehicle.getModel())
                .status(vehicle.getStatus().name());

        if (trip != null) {
            GeoPoint origin = SaGazetteer.geocode(trip.getOrigin());
            GeoPoint destination = SaGazetteer.geocode(trip.getDestination());
            double progress = RouteSimulator.progress(trip, origin, destination, now);
            builder.driverName(trip.getDriver().getUser().getFullName())
                    .tripId(trip.getId())
                    .tripNumber(trip.getTripNumber())
                    .origin(trip.getOrigin())
                    .destination(trip.getDestination())
                    .progressPercent(Math.round(progress * 1000.0) / 10.0)
                    .moving(true);

            boolean lastIsForTrip = last != null && last.getTrip() != null && trip.getId().equals(last.getTrip().getId());
            if (lastIsForTrip) {
                builder.latitude(last.getLatitude()).longitude(last.getLongitude())
                        .speedKmh(last.getSpeed()).headingDeg(last.getHeading())
                        .recordedAt(last.getRecordedAt());
            } else {
                // Trip just started and the simulator hasn't ticked yet.
                RouteSimulator.SimulatedPosition sim = RouteSimulator.simulate(trip, now);
                builder.latitude(sim.point().lat()).longitude(sim.point().lng())
                        .speedKmh(sim.speedKmh()).headingDeg(sim.headingDeg())
                        .recordedAt(now);
            }
            return builder.build();
        }

        Driver assigned = vehicle.getAssignedDriverId() != null ? drivers.get(vehicle.getAssignedDriverId()) : null;
        builder.driverName(assigned != null ? assigned.getUser().getFullName() : null)
                .speedKmh(0.0)
                .moving(false);
        if (last != null) {
            builder.latitude(last.getLatitude()).longitude(last.getLongitude())
                    .headingDeg(last.getHeading()).recordedAt(last.getRecordedAt());
        } else {
            GeoPoint spot = SaGazetteer.depotSpot(vehicle.getId());
            builder.latitude(spot.lat()).longitude(spot.lng()).headingDeg(0.0).recordedAt(now);
        }
        return builder.build();
    }

    @Transactional(readOnly = true)
    public TripTrackResponse getTripTrack(Long tripId) {
        Trip trip = findTrip(tripId);
        GeoPoint origin = SaGazetteer.geocode(trip.getOrigin());
        GeoPoint destination = SaGazetteer.geocode(trip.getDestination());

        List<TripTrackResponse.TrackPoint> points = gpsPositionRepository.findByTripIdOrderByRecordedAtAscIdAsc(tripId)
                .stream()
                .map(p -> new TripTrackResponse.TrackPoint(p.getLatitude(), p.getLongitude(), p.getSpeed(), p.getRecordedAt()))
                .collect(Collectors.toList());

        return TripTrackResponse.builder()
                .tripId(trip.getId())
                .tripNumber(trip.getTripNumber())
                .status(trip.getStatus().name())
                .origin(new TripTrackResponse.Place(trip.getOrigin(), origin.lat(), origin.lng()))
                .destination(new TripTrackResponse.Place(trip.getDestination(), destination.lat(), destination.lng()))
                .points(points)
                .build();
    }

    @Transactional
    public void ingest(PositionIngestRequest request) {
        Vehicle vehicle = entityManager.find(Vehicle.class, request.getVehicleId());
        if (vehicle == null || vehicle.isDeleted()) {
            throw new EntityNotFoundException("Vehicle", request.getVehicleId());
        }
        Trip trip = null;
        if (request.getTripId() != null) {
            trip = findTrip(request.getTripId());
            if (!trip.getVehicle().getId().equals(vehicle.getId())) {
                throw new BusinessRuleException("Trip " + trip.getTripNumber() + " is not assigned to this vehicle");
            }
        }
        gpsPositionRepository.save(GPSPosition.builder()
                .vehicle(vehicle)
                .trip(trip)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .speed(request.getSpeedKmh())
                .heading(request.getHeadingDeg())
                .recordedAt(request.getRecordedAt() != null ? request.getRecordedAt() : LocalDateTime.now())
                .build());
    }

    private Trip findTrip(Long tripId) {
        Trip trip = entityManager.find(Trip.class, tripId);
        if (trip == null || trip.isDeleted()) {
            throw new EntityNotFoundException("Trip", tripId);
        }
        return trip;
    }
}
