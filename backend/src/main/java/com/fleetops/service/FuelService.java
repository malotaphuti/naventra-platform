package com.fleetops.service;

import com.fleetops.dto.fuel.FuelEntryRequest;
import com.fleetops.dto.fuel.FuelEntryResponse;
import com.fleetops.entity.*;
import com.fleetops.exception.BusinessRuleException;
import com.fleetops.exception.EntityNotFoundException;
import com.fleetops.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Service
@RequiredArgsConstructor
public class FuelService {

    private final FuelEntryRepository fuelEntryRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;
    private final TripRepository tripRepository;

    @Transactional
    public FuelEntryResponse recordFuelEntry(FuelEntryRequest request) {
        Vehicle vehicle = vehicleRepository.findByIdAndDeletedFalse(request.getVehicleId())
                .orElseThrow(() -> new EntityNotFoundException("Vehicle", request.getVehicleId()));

        Driver driver = driverRepository.findByIdAndDeletedFalse(request.getDriverId())
                .orElseThrow(() -> new EntityNotFoundException("Driver", request.getDriverId()));

        // Validate odometer is monotonically increasing
        Long lastOdometer = fuelEntryRepository.findMaxOdometerByVehicleId(vehicle.getId()).orElse(0L);
        if (request.getOdometerReadingKm() < lastOdometer) {
            throw new BusinessRuleException(
                    "Odometer reading must be >= last recorded value (" + lastOdometer + " km)");
        }

        BigDecimal totalCost = request.getCostPerLitre()
                .multiply(BigDecimal.valueOf(request.getLitres()))
                .setScale(2, RoundingMode.HALF_UP);

        Trip trip = null;
        if (request.getTripId() != null) {
            trip = tripRepository.findByIdAndDeletedFalse(request.getTripId())
                    .orElseThrow(() -> new EntityNotFoundException("Trip", request.getTripId()));
        }

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

        // Update vehicle odometer
        if (request.getOdometerReadingKm() > vehicle.getCurrentOdometerKm()) {
            vehicle.setCurrentOdometerKm(request.getOdometerReadingKm());
            vehicleRepository.save(vehicle);
        }

        log.info("Fuel entry recorded: {} litres for vehicle {}", request.getLitres(), vehicle.getRegistrationNumber());
        return mapToResponse(entry);
    }

    @Transactional(readOnly = true)
    public Page<FuelEntryResponse> searchFuelEntries(Long vehicleId, Pageable pageable) {
        Specification<FuelEntry> spec = (root, query, cb) -> cb.equal(root.get("deleted"), false);

        if (vehicleId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("vehicle").get("id"), vehicleId));
        }

        return fuelEntryRepository.findAll(spec, pageable).map(this::mapToResponse);
    }

    private FuelEntryResponse mapToResponse(FuelEntry entry) {
        return FuelEntryResponse.builder()
                .id(entry.getId())
                .vehicleId(entry.getVehicle().getId())
                .vehicleRegistration(entry.getVehicle().getRegistrationNumber())
                .driverId(entry.getDriver().getId())
                .driverName(entry.getDriver().getUser().getFullName())
                .tripId(entry.getTrip() != null ? entry.getTrip().getId() : null)
                .filledAt(entry.getFilledAt())
                .fuelType(entry.getFuelType())
                .litres(entry.getLitres())
                .costPerLitre(entry.getCostPerLitre())
                .totalCost(entry.getTotalCost())
                .odometerReadingKm(entry.getOdometerReadingKm())
                .station(entry.getStation())
                .notes(entry.getNotes())
                .receiptUrl(entry.getReceiptUrl())
                .build();
    }
}
