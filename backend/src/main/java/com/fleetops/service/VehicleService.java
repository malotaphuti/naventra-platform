package com.fleetops.service;

import com.fleetops.dto.vehicle.VehicleCreateRequest;
import com.fleetops.dto.vehicle.VehicleResponse;
import com.fleetops.dto.vehicle.VehicleUpdateRequest;
import com.fleetops.entity.Vehicle;
import com.fleetops.entity.enums.VehicleStatus;
import com.fleetops.exception.BusinessRuleException;
import com.fleetops.exception.EntityNotFoundException;
import com.fleetops.exception.InvalidStateTransitionException;
import com.fleetops.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;

    private static final Map<VehicleStatus, Set<VehicleStatus>> VALID_TRANSITIONS;

    static {
        Map<VehicleStatus, Set<VehicleStatus>> map = new java.util.EnumMap<>(VehicleStatus.class);
        map.put(VehicleStatus.AVAILABLE, EnumSet.of(
                VehicleStatus.ON_TRIP, VehicleStatus.RESERVED,
                VehicleStatus.MAINTENANCE, VehicleStatus.OUT_OF_SERVICE, VehicleStatus.RETIRED));
        map.put(VehicleStatus.ON_TRIP, EnumSet.of(
                VehicleStatus.AVAILABLE, VehicleStatus.MAINTENANCE));
        map.put(VehicleStatus.RESERVED, EnumSet.of(
                VehicleStatus.ON_TRIP, VehicleStatus.AVAILABLE));
        map.put(VehicleStatus.MAINTENANCE, EnumSet.of(
                VehicleStatus.AVAILABLE, VehicleStatus.OUT_OF_SERVICE));
        map.put(VehicleStatus.OUT_OF_SERVICE, EnumSet.of(
                VehicleStatus.MAINTENANCE, VehicleStatus.RETIRED, VehicleStatus.AVAILABLE));
        map.put(VehicleStatus.RETIRED, EnumSet.noneOf(VehicleStatus.class));
        VALID_TRANSITIONS = java.util.Collections.unmodifiableMap(map);
    }

    @Transactional
    public VehicleResponse registerVehicle(VehicleCreateRequest request) {
        if (vehicleRepository.existsByRegistrationNumber(request.getRegistrationNumber())) {
            throw new BusinessRuleException("Vehicle with registration number '" +
                    request.getRegistrationNumber() + "' already exists");
        }
        if (StringUtils.hasText(request.getVin()) && vehicleRepository.existsByVin(request.getVin())) {
            throw new BusinessRuleException("Vehicle with VIN '" + request.getVin() + "' already exists");
        }

        Vehicle vehicle = Vehicle.builder()
                .registrationNumber(request.getRegistrationNumber())
                .vin(request.getVin())
                .engineNumber(request.getEngineNumber())
                .chassisNumber(request.getChassisNumber())
                .make(request.getMake())
                .model(request.getModel())
                .variant(request.getVariant())
                .year(request.getYear())
                .color(request.getColor())
                .fuelType(request.getFuelType())
                .seatingCapacity(request.getSeatingCapacity())
                .engineCapacityCc(request.getEngineCapacityCc())
                .purchaseDate(request.getPurchaseDate())
                .purchaseCost(request.getPurchaseCost())
                .insuranceProvider(request.getInsuranceProvider())
                .insurancePolicyNumber(request.getInsurancePolicyNumber())
                .insuranceExpiryDate(request.getInsuranceExpiryDate())
                .licenseExpiryDate(request.getLicenseExpiryDate())
                .currentOdometerKm(request.getCurrentOdometerKm() != null ? request.getCurrentOdometerKm() : 0L)
                .status(VehicleStatus.AVAILABLE)
                .nextServiceDate(request.getNextServiceDate())
                .nextServiceMileageKm(request.getNextServiceMileageKm())
                .build();

        vehicle = vehicleRepository.save(vehicle);
        log.info("Vehicle registered: {} ({})", vehicle.getRegistrationNumber(), vehicle.getId());
        return mapToResponse(vehicle);
    }

    @Transactional
    public VehicleResponse updateVehicle(Long id, VehicleUpdateRequest request) {
        Vehicle vehicle = vehicleRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new EntityNotFoundException("Vehicle", id));

        if (request.getColor() != null) vehicle.setColor(request.getColor());
        if (request.getFuelType() != null) vehicle.setFuelType(request.getFuelType());
        if (request.getInsuranceProvider() != null) vehicle.setInsuranceProvider(request.getInsuranceProvider());
        if (request.getInsurancePolicyNumber() != null) vehicle.setInsurancePolicyNumber(request.getInsurancePolicyNumber());
        if (request.getInsuranceExpiryDate() != null) vehicle.setInsuranceExpiryDate(request.getInsuranceExpiryDate());
        if (request.getLicenseExpiryDate() != null) vehicle.setLicenseExpiryDate(request.getLicenseExpiryDate());
        if (request.getNextServiceDate() != null) vehicle.setNextServiceDate(request.getNextServiceDate());
        if (request.getNextServiceMileageKm() != null) vehicle.setNextServiceMileageKm(request.getNextServiceMileageKm());

        vehicle = vehicleRepository.save(vehicle);
        return mapToResponse(vehicle);
    }

    @Transactional(readOnly = true)
    public VehicleResponse getVehicle(Long id) {
        Vehicle vehicle = vehicleRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new EntityNotFoundException("Vehicle", id));
        return mapToResponse(vehicle);
    }

    @Transactional(readOnly = true)
    public Page<VehicleResponse> searchVehicles(String search, VehicleStatus status, Pageable pageable) {
        Specification<Vehicle> spec = Specification.where(notDeleted());

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (StringUtils.hasText(search)) {
            String pattern = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("registrationNumber")), pattern),
                    cb.like(cb.lower(root.get("make")), pattern),
                    cb.like(cb.lower(root.get("model")), pattern),
                    cb.like(cb.lower(root.get("vin")), pattern)
            ));
        }

        return vehicleRepository.findAll(spec, pageable).map(this::mapToResponse);
    }

    @Transactional
    public void transitionStatus(Long vehicleId, VehicleStatus newStatus, String reason) {
        Vehicle vehicle = vehicleRepository.findByIdAndDeletedFalse(vehicleId)
                .orElseThrow(() -> new EntityNotFoundException("Vehicle", vehicleId));

        VehicleStatus currentStatus = vehicle.getStatus();
        Set<VehicleStatus> allowedTargets = VALID_TRANSITIONS.get(currentStatus);

        if (allowedTargets == null || !allowedTargets.contains(newStatus)) {
            throw new InvalidStateTransitionException("Vehicle", currentStatus.name(), newStatus.name());
        }

        vehicle.setStatus(newStatus);
        vehicleRepository.save(vehicle);
        log.info("Vehicle {} status changed: {} -> {} (reason: {})",
                vehicle.getRegistrationNumber(), currentStatus, newStatus, reason);
    }

    @Transactional(readOnly = true)
    public boolean isAvailable(Long vehicleId) {
        Vehicle vehicle = vehicleRepository.findByIdAndDeletedFalse(vehicleId)
                .orElseThrow(() -> new EntityNotFoundException("Vehicle", vehicleId));
        return vehicle.getStatus() == VehicleStatus.AVAILABLE;
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> getAvailableVehicles() {
        return vehicleRepository.findByStatusAndDeletedFalse(VehicleStatus.AVAILABLE)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public void softDelete(Long vehicleId) {
        Vehicle vehicle = vehicleRepository.findByIdAndDeletedFalse(vehicleId)
                .orElseThrow(() -> new EntityNotFoundException("Vehicle", vehicleId));

        if (vehicle.getStatus() == VehicleStatus.ON_TRIP) {
            throw new BusinessRuleException("Cannot delete a vehicle that is currently on a trip");
        }

        vehicle.setDeleted(true);
        vehicleRepository.save(vehicle);
        log.info("Vehicle soft deleted: {}", vehicle.getRegistrationNumber());
    }

    private Specification<Vehicle> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("deleted"), false);
    }

    private VehicleResponse mapToResponse(Vehicle vehicle) {
        return VehicleResponse.builder()
                .id(vehicle.getId())
                .registrationNumber(vehicle.getRegistrationNumber())
                .vin(vehicle.getVin())
                .engineNumber(vehicle.getEngineNumber())
                .chassisNumber(vehicle.getChassisNumber())
                .make(vehicle.getMake())
                .model(vehicle.getModel())
                .variant(vehicle.getVariant())
                .year(vehicle.getYear())
                .color(vehicle.getColor())
                .fuelType(vehicle.getFuelType())
                .seatingCapacity(vehicle.getSeatingCapacity())
                .engineCapacityCc(vehicle.getEngineCapacityCc())
                .purchaseDate(vehicle.getPurchaseDate())
                .purchaseCost(vehicle.getPurchaseCost())
                .insuranceExpiryDate(vehicle.getInsuranceExpiryDate())
                .licenseExpiryDate(vehicle.getLicenseExpiryDate())
                .currentOdometerKm(vehicle.getCurrentOdometerKm())
                .status(vehicle.getStatus())
                .nextServiceDate(vehicle.getNextServiceDate())
                .nextServiceMileageKm(vehicle.getNextServiceMileageKm())
                .createdAt(vehicle.getCreatedAt())
                .build();
    }
}
