package com.fleetops.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {

    private Long id;
    private String action;
    private String entityType;
    private Long entityId;
    private Long performedByUserId;
    private String performedByUsername;
    private String oldValue;
    private String newValue;
    private String ipAddress;
    private String userAgent;
    private LocalDateTime performedAt;
}
