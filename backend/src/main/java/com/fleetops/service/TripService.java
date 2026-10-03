package com.fleetops.service;

import com.fleetops.dto.trip.TripCreateRequest;
import com.fleetops.dto.trip.TripEndRequest;
import com.fleetops.dto.trip.TripResponse;
import com.fleetops.dto.trip.TripStartRequest;
import com.fleetops.entity.Driver;
import com.fleetops.entity.Trip;
import com.fleetops.entity.User;
import com.fleetops.entity.Vehicle;
import com.fleetops.entity.enums.DriverStatus;
import com.fleetops.entity.enums.TripStatus;
import com.fleetops.entity.enums.VehicleStatus;
import com.fleetops.exception.BusinessRuleException;
import com.fleetops.exception.EntityNotFoundException;
import com.fleetops.exception.InvalidStateTransitionException;
import com.fleetops.repository.DriverRepository;
import com.fleetops.repository.TripRepository;
import com.fleetops.repository.UserRepository;
import com.fleetops.repository.VehicleRepository;
import com.fleetops.security.UserPrincipal;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;
    private final UserRepository userRepository;
    private final VehicleService vehicleService;
    private final CurrentDriverService currentDriverService;

    private static final DateTimeFormatter TRIP_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    /** Trips that still hold their driver and vehicle (pending approval, approved or under way). */
    private static final List<TripStatus> OPEN_STATUSES = List.of(
            TripStatus.REQUESTED, TripStatus.APPROVED, TripStatus.ALLOCATED, TripStatus.IN_PROGRESS);

    private static final List<TripStatus> CANCELLABLE_STATUSES = List.of(
            TripStatus.REQUESTED, TripStatus.APPROVED, TripStatus.ALLOCATED);

    @Transactional
    public TripResponse createTrip(TripCreateRequest request, UserPrincipal requester) {
        // Drivers may only request trips for themselves
        request.setDriverId(currentDriverService.resolveDriverId(requester, request.getDriverId()));

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

        if (driver.getStatus() != DriverStatus.ACTIVE) {
            throw new BusinessRuleException("Driver is not available for trips. Current status: " + driver.getStatus());
        }

        if (tripRepository.existsByDriverAndStatusInAndDeletedFalse(driver, OPEN_STATUSES)) {
            throw new BusinessRuleException(
                    "Driver already has an open trip (requested, approved or in progress)");
        }

        if (tripRepository.existsByVehicleAndStatusInAndDeletedFalse(vehicle, OPEN_STATUSES)) {
            throw new BusinessRuleException(
                    "Vehicle already has an open trip (requested, approved or in progress)");
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
        log.info("Trip created: {} by user {}", trip.getTripNumber(), requester.getUsername());
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

        // The vehicle may have gone to maintenance or out of service since the request was made
        VehicleStatus vehicleStatus = trip.getVehicle().getStatus();
        if (vehicleStatus != VehicleStatus.AVAILABLE) {
            throw new BusinessRuleException("Vehicle " + trip.getVehicle().getRegistrationNumber()
                    + " is no longer available (current status: " + vehicleStatus + ")");
        }

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
    public TripResponse startTrip(Long tripId, TripStartRequest request, UserPrincipal principal) {
        Trip trip = tripRepository.findByIdAndDeletedFalse(tripId)
                .orElseThrow(() -> new EntityNotFoundException("Trip", tripId));
        assertCanAccess(trip, principal);

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

        Driver driver = trip.getDriver();
        driver.setStatus(DriverStatus.ON_TRIP);
        driverRepository.save(driver);

        trip = tripRepository.save(trip);
        log.info("Trip started: {} (mileage: {} km)", trip.getTripNumber(), request.getStartMileageKm());
        return mapToResponse(trip);
    }

    @Transactional
    public TripResponse endTrip(Long tripId, TripEndRequest request, UserPrincipal principal) {
        Trip trip = tripRepository.findByIdAndDeletedFalse(tripId)
                .orElseThrow(() -> new EntityNotFoundException("Trip", tripId));
        assertCanAccess(trip, principal);

        if (trip.getStatus() != TripStatus.IN_PROGRESS) {
            throw new InvalidStateTransitionException("Trip", trip.getStatus().name(), TripStatus.COMPLETED.name());
        }

        if (request.getEndMileageKm() <= trip.getStartMileageKm()) {
            throw new BusinessRuleException(
                    "End mileage must be greater than start mileage (" + trip.getStartMileageKm() + " km)");
        }

        // Only release the vehicle if it is still on this trip; it may have been sent to maintenance mid-trip
        Vehicle vehicle = trip.getVehicle();
        if (vehicle.getStatus() == VehicleStatus.ON_TRIP) {
            vehicleService.transitionStatus(vehicle.getId(), VehicleStatus.AVAILABLE, "Trip ended");
        }

        vehicle.setCurrentOdometerKm(request.getEndMileageKm());
        vehicleRepository.save(vehicle);

        releaseDriver(trip.getDriver());

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

    @Transactional
    public TripResponse cancelTrip(Long tripId, String reason, UserPrincipal principal) {
        Trip trip = tripRepository.findByIdAndDeletedFalse(tripId)
                .orElseThrow(() -> new EntityNotFoundException("Trip", tripId));
        assertCanAccess(trip, principal);

        if (!CANCELLABLE_STATUSES.contains(trip.getStatus())) {
            throw new InvalidStateTransitionException("Trip", trip.getStatus().name(), TripStatus.CANCELLED.name());
        }

        // An approved trip holds a reservation on the vehicle; give it back
        Vehicle vehicle = trip.getVehicle();
        if (trip.getStatus() != TripStatus.REQUESTED && vehicle.getStatus() == VehicleStatus.RESERVED) {
            vehicleService.transitionStatus(vehicle.getId(), VehicleStatus.AVAILABLE, "Trip cancelled");
        }

        trip.setStatus(TripStatus.CANCELLED);
        trip.setReviewNotes(StringUtils.hasText(reason) ? reason.trim() : null);
        releaseDriver(trip.getDriver());

        trip = tripRepository.save(trip);
        log.info("Trip cancelled: {} by {}", trip.getTripNumber(), principal.getUsername());
        return mapToResponse(trip);
    }

    @Transactional(readOnly = true)
    public TripResponse getTrip(Long id, UserPrincipal principal) {
        Trip trip = tripRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new EntityNotFoundException("Trip", id));
        assertCanAccess(trip, principal);
        return mapToResponse(trip);
    }

    @Transactional(readOnly = true)
    public Page<TripResponse> searchTrips(String search, TripStatus status, Long driverId, Pageable pageable,
                                          UserPrincipal principal) {
        // Drivers only ever see their own trips, whatever driverId they ask for
        Long ownDriverId = currentDriverService.ownDriverIdIfDriver(principal);
        Long effectiveDriverId = ownDriverId != null ? ownDriverId : driverId;

        Specification<Trip> spec = Specification.where(notDeleted());

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (effectiveDriverId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("driver").get("id"), effectiveDriverId));
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

    /**
     * Next number for today (TRIP-YYYYMMDD-XXXX), continuing from the highest one already stored,
     * so numbering survives restarts. trip_number's unique constraint guards against concurrent requests.
     */
    private String generateTripNumber() {
        String prefix = "TRIP-" + LocalDate.now().format(TRIP_DATE) + "-";
        long next = tripRepository.findTopByTripNumberStartingWithOrderByTripNumberDesc(prefix)
                .map(last -> Long.parseLong(last.getTripNumber().substring(prefix.length())) + 1)
                .orElse(1L);
        return String.format("%s%04d", prefix, next);
    }

    private void releaseDriver(Driver driver) {
        if (driver.getStatus() == DriverStatus.ON_TRIP) {
            driver.setStatus(DriverStatus.ACTIVE);
            driverRepository.save(driver);
        }
    }

    private void assertCanAccess(Trip trip, UserPrincipal principal) {
        currentDriverService.assertOwnRecord(principal, trip.getDriver().getId());
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
                .reviewNotes(trip.getReviewNotes())
                .vehicleMake(trip.getVehicle().getMake())
                .vehicleModel(trip.getVehicle().getModel())
                .approvedByName(trip.getApprovedBy() != null ? trip.getApprovedBy().getFullName() : null)
                .build();
    }
}
