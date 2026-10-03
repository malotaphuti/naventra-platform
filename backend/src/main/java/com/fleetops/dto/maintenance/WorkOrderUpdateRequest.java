package com.fleetops.dto.maintenance;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Editable details of a work order. Null fields are cleared, so send the full set shown in the form. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderUpdateRequest {

    @Size(max = 100, message = "Workshop must be at most 100 characters")
    private String workshop;

    @Size(max = 100, message = "Mechanic name must be at most 100 characters")
    private String mechanicName;

    @Size(max = 50, message = "Service type must be at most 50 characters")
    private String serviceType;

    private LocalDate scheduledDate;

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
}
