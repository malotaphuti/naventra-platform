package com.fleetops.controller;

import com.fleetops.dto.report.ReportDefinition;
import com.fleetops.dto.report.ReportResponse;
import com.fleetops.service.report.ReportExporter;
import com.fleetops.service.report.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Operational reports with CSV, Excel and PDF export")
public class ReportController {

    private final ReportService reportService;
    private final ReportExporter reportExporter;

    @GetMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'EXECUTIVE')")
    @Operation(summary = "List available reports")
    public List<ReportDefinition> listReports() {
        return reportService.listReports();
    }

    @GetMapping("/{key}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'EXECUTIVE')")
    @Operation(summary = "Generate a report for a date range (defaults to month to date)")
    public ReportResponse getReport(
            @PathVariable String key,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.generate(key, from, to);
    }

    @GetMapping("/{key}/export")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'EXECUTIVE')")
    @Operation(summary = "Download a report as CSV, XLSX or PDF")
    public ResponseEntity<byte[]> exportReport(
            @PathVariable String key,
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        ReportExporter.Format exportFormat = ReportExporter.Format.parse(format);
        ReportResponse report = reportService.generate(key, from, to);
        byte[] body = reportExporter.export(report, exportFormat);
        String filename = "fleetops-%s-%s-to-%s.%s".formatted(
                report.getKey(), report.getFrom(), report.getTo(), exportFormat.extension);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(exportFormat.contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename).build().toString())
                .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION)
                .contentLength(body.length)
                .body(body);
    }
}
