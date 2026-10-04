package com.fleetops.dto.maintenance;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Optional completion details; null fields keep the values already on the work order. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderCompleteRequest {

    @DecimalMin(value = "0.00", message = "Labour cost cannot be negative")
    private BigDecimal labourCost;

    @DecimalMin(value = "0.00", message = "Parts cost cannot be negative")
    private BigDecimal partsCost;

    @Size(max = 50, message = "Invoice number must be at most 50 characters")
    private String invoiceNumber;

    @Size(max = 4000, message = "Parts used must be at most 4000 characters")
    private String partsUsed;

    @Size(max = 4000, message = "Notes must be at most 4000 characters")
    private String notes;

    private LocalDate nextServiceDate;

    @Min(value = 0, message = "Next service mileage cannot be negative")
    private Long nextServiceMileageKm;
}
