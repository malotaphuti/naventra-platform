package com.fleetops.service;

import com.fleetops.dto.maintenance.WorkOrderRequest;
import com.fleetops.dto.maintenance.WorkOrderResponse;
import com.fleetops.entity.Vehicle;
import com.fleetops.entity.WorkOrder;
import com.fleetops.entity.enums.VehicleStatus;
import com.fleetops.entity.enums.WorkOrderStatus;
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

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
@RequiredArgsConstructor
public class MaintenanceService {

    private final WorkOrderRepository workOrderRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleService vehicleService;

    private final AtomicLong woSequence = new AtomicLong(0);

    @Transactional
    public WorkOrderResponse createWorkOrder(WorkOrderRequest request) {
        Vehicle vehicle = vehicleRepository.findByIdAndDeletedFalse(request.getVehicleId())
                .orElseThrow(() -> new EntityNotFoundException("Vehicle", request.getVehicleId()));

        // Auto-change vehicle status to MAINTENANCE
        if (vehicle.getStatus() != VehicleStatus.MAINTENANCE) {
            vehicleService.transitionStatus(vehicle.getId(), VehicleStatus.MAINTENANCE, "Work order created");
        }

        WorkOrder workOrder = WorkOrder.builder()
                .workOrderNumber(generateWorkOrderNumber())
                .vehicle(vehicle)
                .type(request.getType())
                .status(WorkOrderStatus.OPEN)
                .description(request.getDescription())
                .serviceType(request.getServiceType())
                .workshop(request.getWorkshop())
                .mechanicName(request.getMechanicName())
                .scheduledDate(request.getScheduledDate())
                .labourCost(request.getLabourCost())
                .partsCost(request.getPartsCost())
                .build();

        workOrder = workOrderRepository.save(workOrder);
        log.info("Work order created: {} for vehicle {}", workOrder.getWorkOrderNumber(), vehicle.getRegistrationNumber());
        return mapToResponse(workOrder);
    }

    @Transactional
    public WorkOrderResponse completeWorkOrder(Long id) {
        WorkOrder workOrder = workOrderRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new EntityNotFoundException("WorkOrder", id));

        if (workOrder.getStatus() == WorkOrderStatus.COMPLETED) {
            throw new InvalidStateTransitionException("WorkOrder", "COMPLETED", "COMPLETED");
        }

        workOrder.setStatus(WorkOrderStatus.COMPLETED);
        workOrder.setCompletedDate(LocalDate.now());

        if (workOrder.getLabourCost() != null && workOrder.getPartsCost() != null) {
            workOrder.setTotalCost(workOrder.getLabourCost().add(workOrder.getPartsCost()));
        }

        workOrder = workOrderRepository.save(workOrder);

        // Return vehicle to available
        vehicleService.transitionStatus(workOrder.getVehicle().getId(), VehicleStatus.AVAILABLE, "Maintenance completed");

        log.info("Work order completed: {}", workOrder.getWorkOrderNumber());
        return mapToResponse(workOrder);
    }

    @Transactional(readOnly = true)
    public Page<WorkOrderResponse> searchWorkOrders(String search, WorkOrderStatus status, Pageable pageable) {
        Specification<WorkOrder> spec = (root, query, cb) -> cb.equal(root.get("deleted"), false);

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (StringUtils.hasText(search)) {
            String pattern = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("workOrderNumber")), pattern),
                    cb.like(cb.lower(root.get("description")), pattern)
            ));
        }

        return workOrderRepository.findAll(spec, pageable).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public WorkOrderResponse getWorkOrder(Long id) {
        WorkOrder wo = workOrderRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new EntityNotFoundException("WorkOrder", id));
        return mapToResponse(wo);
    }

    private String generateWorkOrderNumber() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long seq = woSequence.incrementAndGet();
        return String.format("WO-%s-%04d", datePart, seq);
    }

    private WorkOrderResponse mapToResponse(WorkOrder wo) {
        return WorkOrderResponse.builder()
                .id(wo.getId())
                .workOrderNumber(wo.getWorkOrderNumber())
                .vehicleId(wo.getVehicle().getId())
                .vehicleRegistration(wo.getVehicle().getRegistrationNumber())
                .type(wo.getType())
                .status(wo.getStatus())
                .description(wo.getDescription())
                .serviceType(wo.getServiceType())
                .workshop(wo.getWorkshop())
                .mechanicName(wo.getMechanicName())
                .scheduledDate(wo.getScheduledDate())
                .completedDate(wo.getCompletedDate())
                .labourCost(wo.getLabourCost())
                .partsCost(wo.getPartsCost())
                .totalCost(wo.getTotalCost())
                .build();
    }
}
