package com.fleetops.service;

import com.fleetops.dto.incident.IncidentCreateRequest;
import com.fleetops.dto.incident.IncidentResponse;
import com.fleetops.dto.incident.IncidentWorkOrderRequest;
import com.fleetops.dto.maintenance.WorkOrderRequest;
import com.fleetops.entity.*;
import com.fleetops.entity.enums.IncidentSeverity;
import com.fleetops.entity.enums.IncidentStatus;
import com.fleetops.entity.enums.IncidentType;
import com.fleetops.entity.enums.VehicleStatus;
import com.fleetops.entity.enums.WorkOrderStatus;
import com.fleetops.exception.BusinessRuleException;
import com.fleetops.exception.EntityNotFoundException;
import com.fleetops.exception.InvalidStateTransitionException;
import com.fleetops.repository.*;
import com.fleetops.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.EnumSet;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class IncidentService {

    private static final DateTimeFormatter INC_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    /** Incidents serious enough to take an available vehicle off the road straight away. */
    private static final Set<IncidentType> GROUNDING_TYPES =
            EnumSet.of(IncidentType.ACCIDENT, IncidentType.BREAKDOWN, IncidentType.MECHANICAL_FAILURE);
    private static final Set<IncidentSeverity> GROUNDING_SEVERITIES =
            EnumSet.of(IncidentSeverity.HIGH, IncidentSeverity.CRITICAL);

    private final IncidentRepository incidentRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final VehicleService vehicleService;
    private final MaintenanceService maintenanceService;
    private final CurrentDriverService currentDriverService;
    private final DriverVehicleAccessService driverVehicleAccessService;

    @Transactional
    public IncidentResponse reportIncident(IncidentCreateRequest request, UserPrincipal principal) {
        Long ownDriverId = currentDriverService.ownDriverIdIfDriver(principal);
        Long driverId = currentDriverService.resolveDriverId(principal, request.getDriverId());

        Vehicle vehicle = vehicleRepository.findByIdAndDeletedFalse(request.getVehicleId())
                .orElseThrow(() -> new EntityNotFoundException("Vehicle", request.getVehicleId()));

        Driver driver = driverRepository.findByIdAndDeletedFalse(driverId)
                .orElseThrow(() -> new EntityNotFoundException("Driver", driverId));

        if (ownDriverId != null) {
            driverVehicleAccessService.assertDriverCanUseVehicle(
                    driverId, vehicle.getId(), "You can only report incidents for your own vehicle");
        }

        LocalDateTime occurredAt = request.getOccurredAt() != null ? request.getOccurredAt() : LocalDateTime.now();
        if (occurredAt.isAfter(LocalDateTime.now().plusMinutes(5))) {
            throw new BusinessRuleException("Occurred date/time cannot be in the future");
        }

        Trip trip = null;
        if (request.getTripId() != null) {
            trip = tripRepository.findByIdAndDeletedFalse(request.getTripId())
                    .orElseThrow(() -> new EntityNotFoundException("Trip", request.getTripId()));
            if (!trip.getVehicle().getId().equals(vehicle.getId())) {
                throw new BusinessRuleException("Trip " + trip.getTripNumber() + " was not made with this vehicle");
            }
            if (ownDriverId != null && !trip.getDriver().getId().equals(ownDriverId)) {
                throw new AccessDeniedException("You can only link incidents to your own trips");
            }
        }

        Incident incident = Incident.builder()
                .incidentNumber(generateIncidentNumber())
                .vehicle(vehicle)
                .driver(driver)
                .trip(trip)
                .type(request.getType())
                .severity(request.getSeverity())
                .description(request.getDescription().trim())
                .location(StringUtils.hasText(request.getLocation()) ? request.getLocation().trim() : null)
                .occurredAt(occurredAt)
                .status(IncidentStatus.REPORTED)
                .build();

        incident = incidentRepository.save(incident);

        // A vehicle on a trip stays ON_TRIP so the trip can still be ended; the manager grounds it afterwards.
        if (vehicle.getStatus() == VehicleStatus.AVAILABLE
                && GROUNDING_TYPES.contains(incident.getType())
                && GROUNDING_SEVERITIES.contains(incident.getSeverity())) {
            vehicleService.transitionStatus(vehicle.getId(), VehicleStatus.OUT_OF_SERVICE,
                    "Incident " + incident.getIncidentNumber());
        }

        log.info("Incident reported: {} - {} on vehicle {}",
                incident.getIncidentNumber(), incident.getType(), vehicle.getRegistrationNumber());
        return mapToResponse(incident);
    }

    @Transactional(readOnly = true)
    public IncidentResponse getIncident(Long id, UserPrincipal principal) {
        Incident incident = findIncident(id);
        currentDriverService.assertOwnRecord(principal, incident.getDriver().getId());
        return mapToResponse(incident);
    }

    @Transactional
    public IncidentResponse reviewIncident(Long id, String notes, UserPrincipal principal) {
        Incident incident = findIncident(id);
        requireStatus(incident, IncidentStatus.UNDER_REVIEW, IncidentStatus.REPORTED);
        incident.setStatus(IncidentStatus.UNDER_REVIEW);
        incident.setReviewedBy(currentUser(principal));
        if (StringUtils.hasText(notes)) {
            incident.setReviewNotes(notes.trim());
        }
        return mapToResponse(incidentRepository.save(incident));
    }

    @Transactional
    public IncidentResponse createWorkOrder(Long id, IncidentWorkOrderRequest request, UserPrincipal principal) {
        Incident incident = findIncident(id);
        requireStatus(incident, IncidentStatus.IN_MAINTENANCE, IncidentStatus.REPORTED, IncidentStatus.UNDER_REVIEW);

        WorkOrder existing = incident.getWorkOrder();
        if (existing != null && existing.getStatus() != WorkOrderStatus.COMPLETED
                && existing.getStatus() != WorkOrderStatus.CANCELLED) {
            throw new BusinessRuleException("Incident is already linked to work order " + existing.getWorkOrderNumber());
        }

        WorkOrder workOrder = maintenanceService.createWorkOrderEntity(WorkOrderRequest.builder()
                .vehicleId(incident.getVehicle().getId())
                .type(request.getType())
                .description(request.getDescription())
                .serviceType(request.getServiceType())
                .workshop(request.getWorkshop())
                .scheduledDate(request.getScheduledDate())
                .build());

        incident.setWorkOrder(workOrder);
        incident.setStatus(IncidentStatus.IN_MAINTENANCE);
        if (incident.getReviewedBy() == null) {
            incident.setReviewedBy(currentUser(principal));
        }
        log.info("Incident {} sent to maintenance as {}", incident.getIncidentNumber(), workOrder.getWorkOrderNumber());
        return mapToResponse(incidentRepository.save(incident));
    }

    @Transactional
    public IncidentResponse resolveIncident(Long id, String resolutionNotes) {
        Incident incident = findIncident(id);
        if (!StringUtils.hasText(resolutionNotes)) {
            throw new BusinessRuleException("Resolution notes are required");
        }
        requireStatus(incident, IncidentStatus.RESOLVED,
                IncidentStatus.REPORTED, IncidentStatus.UNDER_REVIEW, IncidentStatus.IN_MAINTENANCE);
        incident.setStatus(IncidentStatus.RESOLVED);
        incident.setResolutionNotes(resolutionNotes.trim());
        return mapToResponse(incidentRepository.save(incident));
    }

    @Transactional
    public IncidentResponse closeIncident(Long id) {
        Incident incident = findIncident(id);
        requireStatus(incident, IncidentStatus.CLOSED, IncidentStatus.RESOLVED);
        incident.setStatus(IncidentStatus.CLOSED);
        return mapToResponse(incidentRepository.save(incident));
    }

    @Transactional(readOnly = true)
    public Page<IncidentResponse> searchIncidents(String search, IncidentStatus status, IncidentSeverity severity,
                                                  Long vehicleId, Pageable pageable, UserPrincipal principal) {
        Long ownDriverId = currentDriverService.ownDriverIdIfDriver(principal);

        Specification<Incident> spec = (root, query, cb) -> cb.equal(root.get("deleted"), false);

        if (ownDriverId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("driver").get("id"), ownDriverId));
        }
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (severity != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("severity"), severity));
        }
        if (vehicleId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("vehicle").get("id"), vehicleId));
        }
        if (StringUtils.hasText(search)) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("incidentNumber")), pattern),
                    cb.like(cb.lower(root.get("description")), pattern),
                    cb.like(cb.lower(root.get("vehicle").get("registrationNumber")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.<String>get("location"), "")), pattern)
            ));
        }

        return incidentRepository.findAll(spec, pageable).map(this::mapToResponse);
    }

    private void requireStatus(Incident incident, IncidentStatus target, IncidentStatus... allowedFrom) {
        for (IncidentStatus allowed : allowedFrom) {
            if (incident.getStatus() == allowed) {
                return;
            }
        }
        throw new InvalidStateTransitionException("Incident", incident.getStatus().name(), target.name());
    }

    private Incident findIncident(Long id) {
        return incidentRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new EntityNotFoundException("Incident", id));
    }

    private User currentUser(UserPrincipal principal) {
        return userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User", principal.getUserId()));
    }

    private String generateIncidentNumber() {
        String prefix = "INC-" + LocalDate.now().format(INC_DATE) + "-";
        long next = incidentRepository.findTopByIncidentNumberStartingWithOrderByIncidentNumberDesc(prefix)
                .map(last -> Long.parseLong(last.getIncidentNumber().substring(prefix.length())) + 1)
                .orElse(1L);
        return String.format("%s%04d", prefix, next);
    }

    private IncidentResponse mapToResponse(Incident inc) {
        Trip trip = inc.getTrip();
        WorkOrder wo = inc.getWorkOrder();
        User reviewer = inc.getReviewedBy();
        return IncidentResponse.builder()
                .id(inc.getId())
                .incidentNumber(inc.getIncidentNumber())
                .vehicleId(inc.getVehicle().getId())
                .vehicleRegistration(inc.getVehicle().getRegistrationNumber())
                .vehicleStatus(inc.getVehicle().getStatus())
                .driverId(inc.getDriver().getId())
                .driverName(inc.getDriver().getUser().getFullName())
                .tripId(trip != null ? trip.getId() : null)
                .tripNumber(trip != null ? trip.getTripNumber() : null)
                .type(inc.getType())
                .status(inc.getStatus())
                .severity(inc.getSeverity())
                .description(inc.getDescription())
                .location(inc.getLocation())
                .occurredAt(inc.getOccurredAt())
                .reviewNotes(inc.getReviewNotes())
                .reviewedByName(reviewer != null ? reviewer.getFullName() : null)
                .resolutionNotes(inc.getResolutionNotes())
                .workOrderId(wo != null ? wo.getId() : null)
                .workOrderNumber(wo != null ? wo.getWorkOrderNumber() : null)
                .workOrderStatus(wo != null ? wo.getStatus() : null)
                .createdAt(inc.getCreatedAt())
                .build();
    }
}
