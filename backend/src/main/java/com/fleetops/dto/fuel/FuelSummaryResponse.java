package com.fleetops.dto.fuel;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FuelSummaryResponse {

    private LocalDate from;
    private LocalDate to;
    private long entries;
    private double totalLitres;
    private BigDecimal totalCost;
    /** Volume-weighted average (total cost / total litres); null when nothing was logged. */
    private BigDecimal avgCostPerLitre;
}
