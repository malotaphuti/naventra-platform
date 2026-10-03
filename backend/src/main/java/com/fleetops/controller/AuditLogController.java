package com.fleetops.controller;

import com.fleetops.dto.admin.AuditLogResponse;
import com.fleetops.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/v1/admin/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Log", description = "Read-only audit trail of mutating API calls")
public class AuditLogController {

    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Search audit log entries, newest first")
    public Page<AuditLogResponse> search(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 50) Pageable pageable) {
        return auditService.search(username, entityType, action, from, to, pageable);
    }
}
