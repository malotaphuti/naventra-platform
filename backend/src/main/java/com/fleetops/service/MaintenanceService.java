package com.fleetops.service;

import com.fleetops.dto.maintenance.WorkOrderCompleteRequest;
import com.fleetops.dto.maintenance.WorkOrderRequest;
import com.fleetops.dto.maintenance.WorkOrderResponse;
import com.fleetops.dto.maintenance.WorkOrderUpdateRequest;
import com.fleetops.entity.Vehicle;
import com.fleetops.entity.WorkOrder;
import com.fleetops.entity.enums.MaintenanceType;
import com.fleetops.entity.enums.VehicleStatus;
import com.fleetops.entity.enums.WorkOrderStatus;
import com.fleetops.exception.BusinessRuleException;
import com.fleetops.exception.EntityNotFoundException;
import com.fleetops.exception.InvalidStateTransitionException;
import com.fleetops.repository.VehicleRepository;
import com.fleetops.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.EnumSet;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class MaintenanceService {

    /** Work orders that keep a vehicle in the workshop. */
    public static final Set<WorkOrderStatus> ACTIVE_STATUSES =
            EnumSet.of(WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.AWAITING_PARTS);

    private static final DateTimeFormatter WO_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final WorkOrderRepository workOrderRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleService vehicleService;

    @Transactional
    public WorkOrderResponse createWorkOrder(WorkOrderRequest request) {
        return mapToResponse(createWorkOrderEntity(request));
    }

    /** Creates the work order and returns the entity, so other services (incidents) can link to it. */
    @Transactional
    public WorkOrder createWorkOrderEntity(WorkOrderRequest request) {
        Vehicle vehicle = vehicleRepository.findByIdAndDeletedFalse(request.getVehicleId())
                .orElseThrow(() -> new EntityNotFoundException("Vehicle", request.getVehicleId()));

        if (vehicle.getStatus() == VehicleStatus.RETIRED) {
            throw new BusinessRuleException("Vehicle " + vehicle.getRegistrationNumber() + " is retired");
        }

        boolean future = request.getScheduledDate() != null && request.getScheduledDate().isAfter(LocalDate.now());
        String number = generateWorkOrderNumber();

        if (!future) {
            moveVehicleIntoMaintenance(vehicle, number);
        }

        WorkOrder workOrder = WorkOrder.builder()
                .workOrderNumber(number)
                .vehicle(vehicle)
                .type(request.getType())
                .status(future ? WorkOrderStatus.SCHEDULED : WorkOrderStatus.OPEN)
                .description(request.getDescription().trim())
                .serviceType(blankToNull(request.getServiceType()))
                .workshop(blankToNull(request.getWorkshop()))
                .mechanicName(blankToNull(request.getMechanicName()))
                .scheduledDate(request.getScheduledDate() != null ? request.getScheduledDate() : LocalDate.now())
                .labourCost(request.getLabourCost())
                .partsCost(request.getPartsCost())
                .totalCost(sumCosts(request.getLabourCost(), request.getPartsCost()))
                .build();

        workOrder = workOrderRepository.save(workOrder);
        log.info("Work order created: {} ({}) for vehicle {}",
                workOrder.getWorkOrderNumber(), workOrder.getStatus(), vehicle.getRegistrationNumber());
        return workOrder;
    }

    @Transactional
    public WorkOrderResponse startWorkOrder(Long id) {
        WorkOrder wo = findWorkOrder(id);
        requireStatus(wo, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.SCHEDULED, WorkOrderStatus.OPEN);
        moveVehicleIntoMaintenance(wo.getVehicle(), wo.getWorkOrderNumber());
        wo.setStatus(WorkOrderStatus.IN_PROGRESS);
        if (wo.getStartedDate() == null) {
            wo.setStartedDate(LocalDate.now());
        }
        return save(wo);
    }

    @Transactional
    public WorkOrderResponse markAwaitingParts(Long id) {
        WorkOrder wo = findWorkOrder(id);
        requireStatus(wo, WorkOrderStatus.AWAITING_PARTS, WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS);
        wo.setStatus(WorkOrderStatus.AWAITING_PARTS);
        if (wo.getStartedDate() == null) {
            wo.setStartedDate(LocalDate.now());
        }
        return save(wo);
    }

    @Transactional
    public WorkOrderResponse resumeWorkOrder(Long id) {
        WorkOrder wo = findWorkOrder(id);
        requireStatus(wo, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.AWAITING_PARTS);
        wo.setStatus(WorkOrderStatus.IN_PROGRESS);
        return save(wo);
    }

    @Transactional
    public WorkOrderResponse cancelWorkOrder(Long id, String reason) {
        WorkOrder wo = findWorkOrder(id);
        if (wo.getStatus() == WorkOrderStatus.COMPLETED || wo.getStatus() == WorkOrderStatus.CANCELLED) {
            throw new InvalidStateTransitionException("WorkOrder", wo.getStatus().name(), WorkOrderStatus.CANCELLED.name());
        }
        wo.setStatus(WorkOrderStatus.CANCELLED);
        if (StringUtils.hasText(reason)) {
            wo.setNotes(appendLine(wo.getNotes(), "Cancelled: " + reason.trim()));
        }
        releaseVehicleIfIdle(wo, "Work order " + wo.getWorkOrderNumber() + " cancelled");
        return save(wo);
    }

    @Transactional
    public WorkOrderResponse updateWorkOrder(Long id, WorkOrderUpdateRequest request) {
        WorkOrder wo = findWorkOrder(id);
        if (wo.getStatus() == WorkOrderStatus.CANCELLED) {
            throw new BusinessRuleException("A cancelled work order cannot be edited");
        }
        wo.setWorkshop(blankToNull(request.getWorkshop()));
        wo.setMechanicName(blankToNull(request.getMechanicName()));
        wo.setServiceType(blankToNull(request.getServiceType()));
        if (request.getScheduledDate() != null) {
            wo.setScheduledDate(request.getScheduledDate());
        }
        wo.setLabourCost(request.getLabourCost());
        wo.setPartsCost(request.getPartsCost());
        wo.setTotalCost(sumCosts(request.getLabourCost(), request.getPartsCost()));
        wo.setInvoiceNumber(blankToNull(request.getInvoiceNumber()));
        wo.setPartsUsed(blankToNull(request.getPartsUsed()));
        wo.setNotes(blankToNull(request.getNotes()));
        return save(wo);
    }

    @Transactional
    public WorkOrderResponse completeWorkOrder(Long id, WorkOrderCompleteRequest request) {
        WorkOrder wo = findWorkOrder(id);
        requireStatus(wo, WorkOrderStatus.COMPLETED,
                WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.AWAITING_PARTS);

        if (request != null) {
            if (request.getLabourCost() != null) wo.setLabourCost(request.getLabourCost());
            if (request.getPartsCost() != null) wo.setPartsCost(request.getPartsCost());
            if (StringUtils.hasText(request.getInvoiceNumber())) wo.setInvoiceNumber(request.getInvoiceNumber().trim());
            if (StringUtils.hasText(request.getPartsUsed())) wo.setPartsUsed(request.getPartsUsed().trim());
            if (StringUtils.hasText(request.getNotes())) wo.setNotes(appendLine(wo.getNotes(), request.getNotes().trim()));
            if (request.getNextServiceDate() != null) wo.setNextServiceDate(request.getNextServiceDate());
            if (request.getNextServiceMileageKm() != null) wo.setNextServiceMileageKm(request.getNextServiceMileageKm());
        }

        LocalDate today = LocalDate.now();
        wo.setStatus(WorkOrderStatus.COMPLETED);
        wo.setCompletedDate(today);
        if (wo.getStartedDate() == null) {
            wo.setStartedDate(today);
        }
        BigDecimal total = sumCosts(wo.getLabourCost(), wo.getPartsCost());
        wo.setTotalCost(total != null ? total : BigDecimal.ZERO);

        Vehicle vehicle = wo.getVehicle();
        if (wo.getNextServiceDate() != null) {
            vehicle.setNextServiceDate(wo.getNextServiceDate());
        }
        if (wo.getNextServiceMileageKm() != null) {
            vehicle.setNextServiceMileageKm(wo.getNextServiceMileageKm());
        }
        vehicleRepository.save(vehicle);

        releaseVehicleIfIdle(wo, "Maintenance completed (" + wo.getWorkOrderNumber() + ")");

        log.info("Work order completed: {} total R{}", wo.getWorkOrderNumber(), wo.getTotalCost());
        return save(wo);
    }

    @Transactional(readOnly = true)
    public Page<WorkOrderResponse> searchWorkOrders(String search, WorkOrderStatus status, Long vehicleId,
                                                    MaintenanceType type, Pageable pageable) {
        Specification<WorkOrder> spec = (root, query, cb) -> cb.equal(root.get("deleted"), false);

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (vehicleId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("vehicle").get("id"), vehicleId));
        }
        if (type != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("type"), type));
        }
        if (StringUtils.hasText(search)) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("workOrderNumber")), pattern),
                    cb.like(cb.lower(root.get("description")), pattern),
                    cb.like(cb.lower(root.get("vehicle").get("registrationNumber")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.<String>get("workshop"), "")), pattern)
            ));
        }

        return workOrderRepository.findAll(spec, pageable).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public WorkOrderResponse getWorkOrder(Long id) {
        return mapToResponse(findWorkOrder(id));
    }

    /** Puts the vehicle in the workshop; a no-op when it is already there. */
    private void moveVehicleIntoMaintenance(Vehicle vehicle, String workOrderNumber) {
        switch (vehicle.getStatus()) {
            case MAINTENANCE -> { }
            case AVAILABLE, OUT_OF_SERVICE ->
                    vehicleService.transitionStatus(vehicle.getId(), VehicleStatus.MAINTENANCE,
                            "Work order " + workOrderNumber);
            case ON_TRIP -> throw new BusinessRuleException("Vehicle " + vehicle.getRegistrationNumber()
                    + " is on a trip. End the trip first, or schedule the work order for a later date.");
            case RESERVED -> throw new BusinessRuleException("Vehicle " + vehicle.getRegistrationNumber()
                    + " is reserved for a trip. Release the reservation first, or schedule the work order for a later date.");
            case RETIRED -> throw new BusinessRuleException("Vehicle " + vehicle.getRegistrationNumber() + " is retired");
        }
    }

    /** Returns the vehicle to service only if no other work order still holds it in the workshop. */
    private void releaseVehicleIfIdle(WorkOrder wo, String reason) {
        Vehicle vehicle = wo.getVehicle();
        if (vehicle.getStatus() != VehicleStatus.MAINTENANCE) {
            return;
        }
        long otherActive = workOrderRepository.countByVehicleIdAndStatusInAndIdNotAndDeletedFalse(
                vehicle.getId(), ACTIVE_STATUSES, wo.getId());
        if (otherActive == 0) {
            vehicleService.transitionStatus(vehicle.getId(), VehicleStatus.AVAILABLE, reason);
        }
    }

    private void requireStatus(WorkOrder wo, WorkOrderStatus target, WorkOrderStatus... allowedFrom) {
        for (WorkOrderStatus allowed : allowedFrom) {
            if (wo.getStatus() == allowed) {
                return;
            }
        }
        throw new InvalidStateTransitionException("WorkOrder", wo.getStatus().name(), target.name());
    }

    private WorkOrder findWorkOrder(Long id) {
        return workOrderRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new EntityNotFoundException("WorkOrder", id));
    }

    private WorkOrderResponse save(WorkOrder wo) {
        return mapToResponse(workOrderRepository.save(wo));
    }

    private String generateWorkOrderNumber() {
        String prefix = "WO-" + LocalDate.now().format(WO_DATE) + "-";
        long next = workOrderRepository.findTopByWorkOrderNumberStartingWithOrderByWorkOrderNumberDesc(prefix)
                .map(last -> Long.parseLong(last.getWorkOrderNumber().substring(prefix.length())) + 1)
                .orElse(1L);
        return String.format("%s%04d", prefix, next);
    }

    private static BigDecimal sumCosts(BigDecimal labour, BigDecimal parts) {
        if (labour == null && parts == null) {
            return null;
        }
        return (labour != null ? labour : BigDecimal.ZERO).add(parts != null ? parts : BigDecimal.ZERO);
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static String appendLine(String existing, String line) {
        return StringUtils.hasText(existing) ? existing + "\n" + line : line;
    }

    private WorkOrderResponse mapToResponse(WorkOrder wo) {
        Vehicle v = wo.getVehicle();
        return WorkOrderResponse.builder()
                .id(wo.getId())
                .workOrderNumber(wo.getWorkOrderNumber())
                .vehicleId(v.getId())
                .vehicleRegistration(v.getRegistrationNumber())
                .vehicleMake(v.getMake())
                .vehicleModel(v.getModel())
                .vehicleStatus(v.getStatus())
                .vehicleOdometerKm(v.getCurrentOdometerKm())
                .type(wo.getType())
                .status(wo.getStatus())
                .description(wo.getDescription())
                .serviceType(wo.getServiceType())
                .workshop(wo.getWorkshop())
                .mechanicName(wo.getMechanicName())
                .scheduledDate(wo.getScheduledDate())
                .startedDate(wo.getStartedDate())
                .completedDate(wo.getCompletedDate())
                .labourCost(wo.getLabourCost())
                .partsCost(wo.getPartsCost())
                .totalCost(wo.getTotalCost())
                .invoiceNumber(wo.getInvoiceNumber())
                .invoiceUrl(wo.getInvoiceUrl())
                .partsUsed(wo.getPartsUsed())
                .notes(wo.getNotes())
                .nextServiceDate(wo.getNextServiceDate())
                .nextServiceMileageKm(wo.getNextServiceMileageKm())
                .createdAt(wo.getCreatedAt())
                .createdBy(wo.getCreatedBy())
                .build();
    }
}
