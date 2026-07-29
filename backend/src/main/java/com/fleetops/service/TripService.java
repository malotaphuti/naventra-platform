package com.fleetops.service;

import com.fleetops.dto.trip.TripCreateRequest;
import com.fleetops.dto.trip.TripEndRequest;
import com.fleetops.dto.trip.TripResponse;
import com.fleetops.dto.trip.TripStartRequest;
import com.fleetops.entity.Driver;
import com.fleetops.entity.Trip;
import com.fleetops.entity.User;
import com.fleetops.entity.Vehicle;
import com.fleetops.entity.enums.TripStatus;
import com.fleetops.entity.enums.VehicleStatus;
import com.fleetops.exception.BusinessRuleException;
import com.fleetops.exception.EntityNotFoundException;
import com.fleetops.exception.InvalidStateTransitionException;
import com.fleetops.repository.DriverRepository;
import com.fleetops.repository.TripRepository;
import com.fleetops.repository.UserRepository;
import com.fleetops.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;
    private final UserRepository userRepository;
    private final VehicleService vehicleService;

    private final AtomicLong tripSequence = new AtomicLong(0);

    @Transactional
    public TripResponse createTrip(TripCreateRequest request, Long requesterId) {
        // Validate vehicle
        Vehicle vehicle = vehicleRepository.findByIdAndDeletedFalse(request.getVehicleId())
                .orElseThrow(() -> new EntityNotFoundException("Vehicle", request.getVehicleId()));

        if (vehicle.getStatus() != VehicleStatus.AVAILABLE) {
            throw new BusinessRuleException(
                    "Vehicle is not available. Current status: " + vehicle.getStatus());
        }

        if (vehicle.getLicenseExpiryDate() != null && vehicle.getLicenseExpiryDate().isBefore(LocalDate.now())) {
            throw new BusinessRuleException("Vehicle license has expired");
        }

        if (vehicle.getInsuranceExpiryDate() != null && vehicle.getInsuranceExpiryDate().isBefore(LocalDate.now())) {
            throw new BusinessRuleException("Vehicle insurance has expired");
        }

        // Validate driver
        Driver driver = driverRepository.findByIdAndDeletedFalse(request.getDriverId())
                .orElseThrow(() -> new EntityNotFoundException("Driver", request.getDriverId()));

        if (driver.getLicenseExpiryDate().isBefore(LocalDate.now())) {
            throw new BusinessRuleException("Driver license has expired");
        }

        if (driver.getMedicalCertificateExpiry() != null
                && driver.getMedicalCertificateExpiry().isBefore(LocalDate.now())) {
            throw new BusinessRuleException("Driver medical certificate has expired");
        }

        boolean hasActiveTrip = tripRepository.existsByDriverAndStatusInAndDeletedFalse(
                driver, List.of(TripStatus.APPROVED, TripStatus.ALLOCATED, TripStatus.IN_PROGRESS));
        if (hasActiveTrip) {
            throw new BusinessRuleException("Driver already has an active trip");
        }

        // Check vehicle not already on active trip
        boolean vehicleHasActiveTrip = tripRepository.existsByVehicleAndStatusInAndDeletedFalse(
                vehicle, List.of(TripStatus.APPROVED, TripStatus.ALLOCATED, TripStatus.IN_PROGRESS));
        if (vehicleHasActiveTrip) {
            throw new BusinessRuleException("Vehicle already assigned to an active trip");
        }

        // Create trip
        Trip trip = Trip.builder()
                .tripNumber(generateTripNumber())
                .vehicle(vehicle)
                .driver(driver)
                .status(TripStatus.REQUESTED)
                .origin(request.getOrigin())
                .destination(request.getDestination())
                .purpose(request.getPurpose())
                .passengers(request.getPassengers())
                .cargo(request.getCargo())
                .requestedAt(LocalDateTime.now())
                .build();

        trip = tripRepository.save(trip);
        log.info("Trip created: {} by user {}", trip.getTripNumber(), requesterId);
        return mapToResponse(trip);
    }

    @Transactional
    public TripResponse approveTrip(Long tripId, Long approverId) {
        Trip trip = tripRepository.findByIdAndDeletedFalse(tripId)
                .orElseThrow(() -> new EntityNotFoundException("Trip", tripId));

        if (trip.getStatus() != TripStatus.REQUESTED) {
            throw new InvalidStateTransitionException("Trip", trip.getStatus().name(), TripStatus.APPROVED.name());
        }

        User approver = userRepository.findById(approverId)
                .orElseThrow(() -> new EntityNotFoundException("User", approverId));

        // Reserve the vehicle
        vehicleService.transitionStatus(trip.getVehicle().getId(), VehicleStatus.RESERVED, "Trip approved");

        trip.setStatus(TripStatus.APPROVED);
        trip.setApprovedAt(LocalDateTime.now());
        trip.setApprovedBy(approver);

        trip = tripRepository.save(trip);
        log.info("Trip approved: {} by {}", trip.getTripNumber(), approver.getUsername());
        return mapToResponse(trip);
    }

    @Transactional
    public TripResponse rejectTrip(Long tripId, Long approverId, String reason) {
        Trip trip = tripRepository.findByIdAndDeletedFalse(tripId)
                .orElseThrow(() -> new EntityNotFoundException("Trip", tripId));

        if (trip.getStatus() != TripStatus.REQUESTED) {
            throw new InvalidStateTransitionException("Trip", trip.getStatus().name(), TripStatus.REJECTED.name());
        }

        trip.setStatus(TripStatus.REJECTED);
        trip.setRejectionReason(reason);

        trip = tripRepository.save(trip);
        log.info("Trip rejected: {} - reason: {}", trip.getTripNumber(), reason);
        return mapToResponse(trip);
    }

    @Transactional
    public TripResponse startTrip(Long tripId, TripStartRequest request) {
        Trip trip = tripRepository.findByIdAndDeletedFalse(tripId)
                .orElseThrow(() -> new EntityNotFoundException("Trip", tripId));

        if (trip.getStatus() != TripStatus.APPROVED) {
            throw new InvalidStateTransitionException("Trip", trip.getStatus().name(), TripStatus.IN_PROGRESS.name());
        }

        Vehicle vehicle = trip.getVehicle();
        if (request.getStartMileageKm() < vehicle.getCurrentOdometerKm()) {
            throw new BusinessRuleException("Start mileage cannot be less than vehicle's current odometer");
        }

        // Update vehicle status
        vehicleService.transitionStatus(vehicle.getId(), VehicleStatus.ON_TRIP, "Trip started");

        trip.setStatus(TripStatus.IN_PROGRESS);
        trip.setStartedAt(LocalDateTime.now());
        trip.setStartMileageKm(request.getStartMileageKm());

        trip = tripRepository.save(trip);
        log.info("Trip started: {} (mileage: {} km)", trip.getTripNumber(), request.getStartMileageKm());
        return mapToResponse(trip);
    }

    @Transactional
    public TripResponse endTrip(Long tripId, TripEndRequest request) {
        Trip trip = tripRepository.findByIdAndDeletedFalse(tripId)
                .orElseThrow(() -> new EntityNotFoundException("Trip", tripId));

        if (trip.getStatus() != TripStatus.IN_PROGRESS) {
            throw new InvalidStateTransitionException("Trip", trip.getStatus().name(), TripStatus.COMPLETED.name());
        }

        if (request.getEndMileageKm() <= trip.getStartMileageKm()) {
            throw new BusinessRuleException(
                    "End mileage must be greater than start mileage (" + trip.getStartMileageKm() + " km)");
        }

        // Return vehicle to available
        vehicleService.transitionStatus(trip.getVehicle().getId(), VehicleStatus.AVAILABLE, "Trip ended");

        // Update vehicle odometer
        Vehicle vehicle = trip.getVehicle();
        vehicle.setCurrentOdometerKm(request.getEndMileageKm());
        vehicleRepository.save(vehicle);

        long distance = request.getEndMileageKm() - trip.getStartMileageKm();

        trip.setStatus(TripStatus.COMPLETED);
        trip.setCompletedAt(LocalDateTime.now());
        trip.setEndMileageKm(request.getEndMileageKm());
        trip.setDistanceKm(distance);

        trip = tripRepository.save(trip);
        log.info("Trip ended: {} (distance: {} km)", trip.getTripNumber(), distance);
        return mapToResponse(trip);
    }

    @Transactional
    public TripResponse closeTrip(Long tripId) {
        Trip trip = tripRepository.findByIdAndDeletedFalse(tripId)
                .orElseThrow(() -> new EntityNotFoundException("Trip", tripId));

        if (trip.getStatus() != TripStatus.COMPLETED) {
            throw new InvalidStateTransitionException("Trip", trip.getStatus().name(), TripStatus.CLOSED.name());
        }

        trip.setStatus(TripStatus.CLOSED);
        trip.setClosedAt(LocalDateTime.now());

        trip = tripRepository.save(trip);
        log.info("Trip closed: {}", trip.getTripNumber());
        return mapToResponse(trip);
    }

    @Transactional(readOnly = true)
    public TripResponse getTrip(Long id) {
        Trip trip = tripRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new EntityNotFoundException("Trip", id));
        return mapToResponse(trip);
    }

    @Transactional(readOnly = true)
    public Page<TripResponse> searchTrips(String search, TripStatus status, Long driverId, Pageable pageable) {
        Specification<Trip> spec = Specification.where(notDeleted());

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (driverId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("driver").get("id"), driverId));
        }
        if (StringUtils.hasText(search)) {
            String pattern = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("tripNumber")), pattern),
                    cb.like(cb.lower(root.get("origin")), pattern),
                    cb.like(cb.lower(root.get("destination")), pattern)
            ));
        }

        return tripRepository.findAll(spec, pageable).map(this::mapToResponse);
    }

    private String generateTripNumber() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long sequence = tripSequence.incrementAndGet();
        return String.format("TRIP-%s-%04d", datePart, sequence);
    }

    private Specification<Trip> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("deleted"), false);
    }

    private TripResponse mapToResponse(Trip trip) {
        return TripResponse.builder()
                .id(trip.getId())
                .tripNumber(trip.getTripNumber())
                .vehicleId(trip.getVehicle().getId())
                .vehicleRegistration(trip.getVehicle().getRegistrationNumber())
                .driverId(trip.getDriver().getId())
                .driverName(trip.getDriver().getUser() != null ? trip.getDriver().getUser().getFullName() : null)
                .status(trip.getStatus())
                .origin(trip.getOrigin())
                .destination(trip.getDestination())
                .purpose(trip.getPurpose())
                .passengers(trip.getPassengers())
                .cargo(trip.getCargo())
                .requestedAt(trip.getRequestedAt())
                .approvedAt(trip.getApprovedAt())
                .startedAt(trip.getStartedAt())
                .completedAt(trip.getCompletedAt())
                .closedAt(trip.getClosedAt())
                .startMileageKm(trip.getStartMileageKm())
                .endMileageKm(trip.getEndMileageKm())
                .distanceKm(trip.getDistanceKm())
                .rejectionReason(trip.getRejectionReason())
                .build();
    }
}
