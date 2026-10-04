package com.fleetops.service;

import com.fleetops.dto.fuel.FuelEntryRequest;
import com.fleetops.dto.fuel.FuelEntryResponse;
import com.fleetops.dto.fuel.FuelSummaryResponse;
import com.fleetops.entity.*;
import com.fleetops.exception.BusinessRuleException;
import com.fleetops.exception.EntityNotFoundException;
import com.fleetops.repository.*;
import com.fleetops.security.UserPrincipal;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class FuelService {

    private final FuelEntryRepository fuelEntryRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;
    private final TripRepository tripRepository;
    private final CurrentDriverService currentDriverService;
    private final DriverVehicleAccessService driverVehicleAccessService;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public FuelEntryResponse recordFuelEntry(FuelEntryRequest request, UserPrincipal principal) {
        Long ownDriverId = currentDriverService.ownDriverIdIfDriver(principal);
        Long driverId = currentDriverService.resolveDriverId(principal, request.getDriverId());

        Vehicle vehicle = vehicleRepository.findByIdAndDeletedFalse(request.getVehicleId())
                .orElseThrow(() -> new EntityNotFoundException("Vehicle", request.getVehicleId()));

        Driver driver = driverRepository.findByIdAndDeletedFalse(driverId)
                .orElseThrow(() -> new EntityNotFoundException("Driver", driverId));

        if (ownDriverId != null) {
            driverVehicleAccessService.assertDriverCanUseVehicle(
                    driverId, vehicle.getId(), "You can only log fuel for your own vehicle");
        }

        if (request.getFilledAt().isAfter(LocalDateTime.now().plusMinutes(5))) {
            throw new BusinessRuleException("Fill date/time cannot be in the future");
        }

        // Only previous fuel readings are a hard floor: the vehicle odometer may already have been
        // advanced by a trip that ended after this fuel stop.
        Long lastOdometer = fuelEntryRepository.findMaxOdometerByVehicleId(vehicle.getId()).orElse(0L);
        if (request.getOdometerReadingKm() < lastOdometer) {
            throw new BusinessRuleException(
                    "Odometer reading must be >= last recorded fuel reading (" + lastOdometer + " km)");
        }

        Trip trip = null;
        if (request.getTripId() != null) {
            trip = tripRepository.findByIdAndDeletedFalse(request.getTripId())
                    .orElseThrow(() -> new EntityNotFoundException("Trip", request.getTripId()));
            if (!trip.getVehicle().getId().equals(vehicle.getId())) {
                throw new BusinessRuleException("Trip " + trip.getTripNumber() + " was not made with this vehicle");
            }
            if (ownDriverId != null && !trip.getDriver().getId().equals(ownDriverId)) {
                throw new AccessDeniedException("You can only link fuel to your own trips");
            }
        }

        BigDecimal totalCost = request.getCostPerLitre()
                .multiply(BigDecimal.valueOf(request.getLitres()))
                .setScale(2, RoundingMode.HALF_UP);

        FuelEntry entry = FuelEntry.builder()
                .vehicle(vehicle)
                .driver(driver)
                .trip(trip)
                .filledAt(request.getFilledAt())
                .fuelType(request.getFuelType())
                .litres(request.getLitres())
                .costPerLitre(request.getCostPerLitre())
                .totalCost(totalCost)
                .odometerReadingKm(request.getOdometerReadingKm())
                .station(request.getStation())
                .notes(request.getNotes())
                .build();

        entry = fuelEntryRepository.save(entry);

        if (request.getOdometerReadingKm() > vehicle.getCurrentOdometerKm()) {
            vehicle.setCurrentOdometerKm(request.getOdometerReadingKm());
            vehicleRepository.save(vehicle);
        }

        log.info("Fuel entry recorded: {} litres for vehicle {}", request.getLitres(), vehicle.getRegistrationNumber());
        return mapToResponse(entry);
    }

    @Transactional(readOnly = true)
    public FuelEntryResponse getFuelEntry(Long id, UserPrincipal principal) {
        FuelEntry entry = findEntry(id);
        currentDriverService.assertOwnRecord(principal, entry.getDriver().getId());
        return mapToResponse(entry);
    }

    @Transactional
    public void deleteFuelEntry(Long id) {
        FuelEntry entry = findEntry(id);
        entry.setDeleted(true);
        fuelEntryRepository.save(entry);
        log.info("Fuel entry {} deleted", id);
    }

    @Transactional(readOnly = true)
    public Page<FuelEntryResponse> searchFuelEntries(String search, Long vehicleId, Long driverId,
                                                     LocalDate from, LocalDate to,
                                                     Pageable pageable, UserPrincipal principal) {
        Long ownDriverId = currentDriverService.ownDriverIdIfDriver(principal);
        Long effectiveDriverId = ownDriverId != null ? ownDriverId : driverId;

        Specification<FuelEntry> spec = (root, query, cb) -> cb.equal(root.get("deleted"), false);

        if (effectiveDriverId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("driver").get("id"), effectiveDriverId));
        }
        if (vehicleId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("vehicle").get("id"), vehicleId));
        }
        if (from != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("filledAt"), from.atStartOfDay()));
        }
        if (to != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThan(root.get("filledAt"), to.plusDays(1).atStartOfDay()));
        }
        if (StringUtils.hasText(search)) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("vehicle").get("registrationNumber")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.<String>get("station"), "")), pattern),
                    cb.like(cb.lower(root.get("fuelType")), pattern)
            ));
        }

        return fuelEntryRepository.findAll(spec, pageable).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public FuelSummaryResponse getSummary(LocalDate from, LocalDate to, Long vehicleId, Long driverId,
                                          UserPrincipal principal) {
        Long ownDriverId = currentDriverService.ownDriverIdIfDriver(principal);
        Long effectiveDriverId = ownDriverId != null ? ownDriverId : driverId;

        StringBuilder jpql = new StringBuilder(
                "SELECT COUNT(f), COALESCE(SUM(f.litres), 0), COALESCE(SUM(f.totalCost), 0) " +
                "FROM FuelEntry f WHERE f.deleted = false");
        Map<String, Object> params = new HashMap<>();
        if (effectiveDriverId != null) {
            jpql.append(" AND f.driver.id = :driverId");
            params.put("driverId", effectiveDriverId);
        }
        if (vehicleId != null) {
            jpql.append(" AND f.vehicle.id = :vehicleId");
            params.put("vehicleId", vehicleId);
        }
        if (from != null) {
            jpql.append(" AND f.filledAt >= :from");
            params.put("from", from.atStartOfDay());
        }
        if (to != null) {
            jpql.append(" AND f.filledAt < :to");
            params.put("to", to.plusDays(1).atStartOfDay());
        }

        TypedQuery<Object[]> query = entityManager.createQuery(jpql.toString(), Object[].class);
        params.forEach(query::setParameter);
        Object[] row = query.getSingleResult();

        long entries = ((Number) row[0]).longValue();
        double litres = ((Number) row[1]).doubleValue();
        BigDecimal cost = toBigDecimal(row[2]).setScale(2, RoundingMode.HALF_UP);
        BigDecimal avg = litres > 0
                ? cost.divide(BigDecimal.valueOf(litres), 2, RoundingMode.HALF_UP)
                : null;

        return FuelSummaryResponse.builder()
                .from(from)
                .to(to)
                .entries(entries)
                .totalLitres(Math.round(litres * 100.0) / 100.0)
                .totalCost(cost)
                .avgCostPerLitre(avg)
                .build();
    }

    private FuelEntry findEntry(Long id) {
        return fuelEntryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new EntityNotFoundException("FuelEntry", id));
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        return value == null ? BigDecimal.ZERO : new BigDecimal(value.toString());
    }

    private FuelEntryResponse mapToResponse(FuelEntry entry) {
        return FuelEntryResponse.builder()
                .id(entry.getId())
                .vehicleId(entry.getVehicle().getId())
                .vehicleRegistration(entry.getVehicle().getRegistrationNumber())
                .driverId(entry.getDriver().getId())
                .driverName(entry.getDriver().getUser().getFullName())
                .tripId(entry.getTrip() != null ? entry.getTrip().getId() : null)
                .tripNumber(entry.getTrip() != null ? entry.getTrip().getTripNumber() : null)
                .filledAt(entry.getFilledAt())
                .fuelType(entry.getFuelType())
                .litres(entry.getLitres())
                .costPerLitre(entry.getCostPerLitre())
                .totalCost(entry.getTotalCost())
                .odometerReadingKm(entry.getOdometerReadingKm())
                .station(entry.getStation())
                .notes(entry.getNotes())
                .receiptUrl(entry.getReceiptUrl())
                .createdAt(entry.getCreatedAt())
                .build();
    }
}
