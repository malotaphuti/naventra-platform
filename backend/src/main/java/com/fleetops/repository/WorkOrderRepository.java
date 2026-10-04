package com.fleetops.repository;

import com.fleetops.entity.WorkOrder;
import com.fleetops.entity.enums.WorkOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long>, JpaSpecificationExecutor<WorkOrder> {

    Optional<WorkOrder> findByIdAndDeletedFalse(Long id);

    List<WorkOrder> findByStatusAndDeletedFalse(WorkOrderStatus status);

    List<WorkOrder> findByVehicleIdAndDeletedFalse(Long vehicleId);

    List<WorkOrder> findByScheduledDateBeforeAndStatusAndDeletedFalse(
            LocalDate date, WorkOrderStatus status);

    long countByStatusAndDeletedFalse(WorkOrderStatus status);

    long countByStatusInAndDeletedFalse(Collection<WorkOrderStatus> statuses);

    List<WorkOrder> findTop8ByStatusInAndDeletedFalseOrderByScheduledDateAsc(Collection<WorkOrderStatus> statuses);

    @Query("SELECT COALESCE(SUM(w.totalCost), 0) FROM WorkOrder w WHERE w.deleted = false " +
           "AND w.completedDate >= :from AND w.completedDate <= :to")
    BigDecimal sumCostBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    Optional<WorkOrder> findTopByWorkOrderNumberStartingWithOrderByWorkOrderNumberDesc(String prefix);

    long countByVehicleIdAndStatusInAndIdNotAndDeletedFalse(
            Long vehicleId, Collection<WorkOrderStatus> statuses, Long excludedId);
}
