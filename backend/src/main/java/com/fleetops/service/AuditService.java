package com.fleetops.service;

import com.fleetops.dto.admin.AuditLogResponse;
import com.fleetops.entity.AuditLog;
import com.fleetops.repository.AuditLogRepository;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    public static final String ATTR_ACTION = "fleetops.audit.action";
    public static final String ATTR_OLD_VALUE = "fleetops.audit.oldValue";
    public static final String ATTR_NEW_VALUE = "fleetops.audit.newValue";
    public static final String ATTR_ENTITY_ID = "fleetops.audit.entityId";

    private final AuditLogRepository auditLogRepository;

    // Audit writes happen off the request thread so a slow or failing insert never affects the API call.
    // Bounded queue; when it overflows the oldest pending entry is dropped rather than blocking requests.
    private final ExecutorService executor = new ThreadPoolExecutor(1, 1, 0L, TimeUnit.MILLISECONDS,
            new LinkedBlockingQueue<>(5000), r -> {
                Thread t = new Thread(r, "audit-writer");
                t.setDaemon(true);
                return t;
            }, new ThreadPoolExecutor.DiscardOldestPolicy());

    /**
     * Lets a controller enrich the audit row written for the current request
     * (e.g. a status change with its old/new values and reason). Any argument may be null.
     */
    public void annotate(String action, String oldValue, String newValue) {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs == null) return;
        if (action != null) attrs.setAttribute(ATTR_ACTION, action, RequestAttributes.SCOPE_REQUEST);
        if (oldValue != null) attrs.setAttribute(ATTR_OLD_VALUE, oldValue, RequestAttributes.SCOPE_REQUEST);
        if (newValue != null) attrs.setAttribute(ATTR_NEW_VALUE, newValue, RequestAttributes.SCOPE_REQUEST);
    }

    public void recordAsync(AuditLog entry) {
        try {
            executor.execute(() -> {
                try {
                    auditLogRepository.save(entry);
                } catch (Exception e) {
                    log.warn("Failed to write audit log {} {} {}: {}",
                            entry.getAction(), entry.getEntityType(), entry.getEntityId(), e.getMessage());
                }
            });
        } catch (Exception e) {
            log.warn("Audit log not queued: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> search(String username, String entityType, String action,
                                         LocalDate from, LocalDate to, Pageable pageable) {
        Specification<AuditLog> spec = (root, query, cb) -> cb.conjunction();

        if (StringUtils.hasText(username)) {
            String pattern = "%" + username.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("performedByUsername")), pattern));
        }
        if (StringUtils.hasText(entityType)) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(cb.lower(root.get("entityType")), entityType.trim().toLowerCase()));
        }
        if (StringUtils.hasText(action)) {
            String pattern = "%" + action.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("action")), pattern));
        }
        if (from != null) {
            LocalDateTime start = from.atStartOfDay();
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("performedAt"), start));
        }
        if (to != null) {
            LocalDateTime end = to.plusDays(1).atStartOfDay();
            spec = spec.and((root, query, cb) -> cb.lessThan(root.get("performedAt"), end));
        }

        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "performedAt").and(Sort.by(Sort.Direction.DESC, "id")));
        return auditLogRepository.findAll(spec, sorted).map(this::mapToResponse);
    }

    @PreDestroy
    void shutdown() {
        executor.shutdown();
        try {
            executor.awaitTermination(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private AuditLogResponse mapToResponse(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .action(log.getAction())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .performedByUserId(log.getPerformedByUserId())
                .performedByUsername(log.getPerformedByUsername())
                .oldValue(log.getOldValue())
                .newValue(log.getNewValue())
                .ipAddress(log.getIpAddress())
                .userAgent(log.getUserAgent())
                .performedAt(log.getPerformedAt())
                .build();
    }
}
