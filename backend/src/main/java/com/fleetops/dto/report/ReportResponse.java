package com.fleetops.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** A tabular report: cells are Strings, Numbers or null. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportResponse {

    private String key;
    private String title;
    private String description;
    private LocalDate from;
    private LocalDate to;
    private List<String> columns;
    private List<List<Object>> rows;
    private LocalDateTime generatedAt;
}
