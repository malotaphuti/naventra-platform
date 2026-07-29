package com.fleetops.service;

import com.fleetops.dto.incident.IncidentCreateRequest;
import com.fleetops.dto.incident.IncidentResponse;
import com.fleetops.entity.*;
import com.fleetops.entity.enums.IncidentStatus;
import com.fleetops.exception.EntityNotFoundException;
import com.fleetops.exception.InvalidStateTransitionException;
import com.fleetops.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
@RequiredArgsConstructor
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;

    private final AtomicLong incSequence = new AtomicLong(0);

    @Transactional
    public IncidentResponse reportIncident(IncidentCreateRequest request) {
        Vehicle vehicle = vehicleRepository.findByIdAndDeletedFalse(request.getVehicleId())
                .orElseThrow(() -> new EntityNotFoundException("Vehicle", request.getVehicleId()));

        Driver driver = driverRepository.findByIdAndDeletedFalse(request.getDriverId())
                .orElseThrow(() -> new EntityNotFoundException("Driver", request.getDriverId()));

        Incident incident = Incident.builder()
                .incidentNumber(generateIncidentNumber())
                .vehicle(vehicle)
                .driver(driver)
                .type(request.getType())
                .severity(request.getSeverity())
                .description(request.getDescription())
                .location(request.getLocation())
                .occurredAt(request.getOccurredAt())
                .status(IncidentStatus.REPORTED)
                .build();

        incident = incidentRepository.save(incident);
        log.info("Incident reported: {} - {} on vehicle {}",
                incident.getIncidentNumber(), incident.getType(), vehicle.getRegistrationNumber());
        return mapToResponse(incident);
    }

    @Transactional
    public IncidentResponse resolveIncident(Long id, String resolutionNotes) {
        Incident incident = incidentRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new EntityNotFoundException("Incident", id));

        if (incident.getStatus() == IncidentStatus.CLOSED) {
            throw new InvalidStateTransitionException("Incident", "CLOSED", "RESOLVED");
        }

        incident.setStatus(IncidentStatus.RESOLVED);
        incident.setResolutionNotes(resolutionNotes);
        incident = incidentRepository.save(incident);
        return mapToResponse(incident);
    }

    @Transactional(readOnly = true)
    public Page<IncidentResponse> searchIncidents(String search, IncidentStatus status, Pageable pageable) {
        Specification<Incident> spec = (root, query, cb) -> cb.equal(root.get("deleted"), false);

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (StringUtils.hasText(search)) {
            String pattern = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("incidentNumber")), pattern),
                    cb.like(cb.lower(root.get("description")), pattern)
            ));
        }

        return incidentRepository.findAll(spec, pageable).map(this::mapToResponse);
    }

    private String generateIncidentNumber() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long seq = incSequence.incrementAndGet();
        return String.format("INC-%s-%04d", datePart, seq);
    }

    private IncidentResponse mapToResponse(Incident inc) {
        return IncidentResponse.builder()
                .id(inc.getId())
                .incidentNumber(inc.getIncidentNumber())
                .vehicleId(inc.getVehicle().getId())
                .vehicleRegistration(inc.getVehicle().getRegistrationNumber())
                .driverId(inc.getDriver().getId())
                .driverName(inc.getDriver().getUser().getFullName())
                .type(inc.getType())
                .status(inc.getStatus())
                .severity(inc.getSeverity())
                .description(inc.getDescription())
                .location(inc.getLocation())
                .occurredAt(inc.getOccurredAt())
                .resolutionNotes(inc.getResolutionNotes())
                .build();
    }
}
