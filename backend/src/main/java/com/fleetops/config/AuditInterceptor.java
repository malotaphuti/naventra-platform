package com.fleetops.config;

import com.fleetops.entity.AuditLog;
import com.fleetops.security.UserPrincipal;
import com.fleetops.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Writes one audit row per successful mutating API call. Request bodies are never recorded
 * (they can contain passwords); controllers may add old/new values via {@link AuditService#annotate}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuditInterceptor implements HandlerInterceptor {

    private static final Set<String> MUTATING = Set.of("POST", "PUT", "PATCH", "DELETE");
    private static final Set<String> EXCLUDED = Set.of("/v1/auth/login", "/v1/auth/refresh");
    private static final long UNKNOWN_ID = 0L;

    private final AuditService auditService;

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        try {
            if (ex != null || response.getStatus() >= 400) return;
            String method = request.getMethod().toUpperCase(Locale.ROOT);
            if (!MUTATING.contains(method)) return;

            String path = request.getRequestURI().substring(request.getContextPath().length());
            if (path.endsWith("/") && path.length() > 1) path = path.substring(0, path.length() - 1);
            if (!path.startsWith("/v1/") || EXCLUDED.contains(path)) return;

            auditService.recordAsync(buildEntry(request, method, path));
        } catch (Exception e) {
            log.warn("Could not build audit entry: {}", e.getMessage());
        }
    }

    private AuditLog buildEntry(HttpServletRequest request, String method, String path) {
        Long userId = null;
        String username = "anonymous";
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            userId = principal.getUserId();
            username = principal.getUsername();
        }

        List<String> segments = new ArrayList<>(Arrays.stream(path.split("/"))
                .filter(StringUtils::hasText).toList());
        segments.remove(0); // "v1"
        if (!segments.isEmpty() && segments.get(0).equals("admin")) segments.remove(0);

        String entityType;
        Long entityId = null;
        String action;

        if (!segments.isEmpty() && segments.get(0).equals("auth")) {
            entityType = "User";
            action = segments.size() > 1 ? toAction(segments.get(1)) : method;
            // logout / change-password act on the caller; register creates someone else
            if (!action.equals("REGISTER")) entityId = userId;
        } else {
            int idIndex = -1;
            for (int i = 0; i < segments.size(); i++) {
                if (segments.get(i).matches("\\d+")) {
                    idIndex = i;
                    break;
                }
            }
            List<String> trailing;
            if (idIndex > 0) {
                entityType = toEntityType(segments.get(idIndex - 1));
                entityId = Long.parseLong(segments.get(idIndex));
                trailing = segments.subList(idIndex + 1, segments.size());
            } else {
                entityType = segments.isEmpty() ? "Unknown" : toEntityType(segments.get(0));
                trailing = segments.size() > 1 ? segments.subList(1, segments.size()) : List.of();
            }
            action = deriveAction(method, trailing);
        }

        Object override = request.getAttribute(AuditService.ATTR_ACTION);
        if (override instanceof String s) action = s;
        if (entityId == null) {
            Object created = request.getAttribute(AuditService.ATTR_ENTITY_ID);
            if (created instanceof Long l) entityId = l;
        }

        return AuditLog.builder()
                .action(truncate(action, 50))
                .entityType(truncate(entityType, 50))
                .entityId(entityId != null ? entityId : UNKNOWN_ID)
                .performedByUserId(userId != null ? userId : UNKNOWN_ID)
                .performedByUsername(truncate(username, 50))
                .oldValue(asString(request.getAttribute(AuditService.ATTR_OLD_VALUE)))
                .newValue(asString(request.getAttribute(AuditService.ATTR_NEW_VALUE)))
                .ipAddress(truncate(clientIp(request), 45))
                .userAgent(truncate(request.getHeader("User-Agent"), 500))
                .performedAt(LocalDateTime.now())
                .build();
    }

    private static String deriveAction(String method, List<String> trailing) {
        if (trailing.isEmpty()) {
            return switch (method) {
                case "POST" -> "CREATE";
                case "DELETE" -> "DELETE";
                default -> "UPDATE";
            };
        }
        String word = toAction(String.join("_", trailing));
        return switch (method) {
            case "PATCH" -> word + "_CHANGE";
            case "DELETE" -> "REMOVE_" + word;
            default -> word;
        };
    }

    private static String toAction(String segment) {
        return segment.replace('-', '_').toUpperCase(Locale.ROOT);
    }

    /** "work-orders" becomes "WorkOrder", "trips" becomes "Trip". */
    private static String toEntityType(String segment) {
        StringBuilder sb = new StringBuilder();
        for (String part : segment.split("[-_]")) {
            if (part.isEmpty()) continue;
            sb.append(Character.toUpperCase(part.charAt(0))).append(part.substring(1).toLowerCase(Locale.ROOT));
        }
        String name = sb.toString();
        if (name.endsWith("ies")) return name.substring(0, name.length() - 3) + "y";
        if (name.endsWith("s") && !name.endsWith("ss")) return name.substring(0, name.length() - 1);
        return name;
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) {
            String first = forwarded.split(",")[0].trim();
            if (!first.isEmpty()) return first;
        }
        String remote = request.getRemoteAddr();
        return StringUtils.hasText(remote) ? remote : "unknown";
    }

    private static String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private static String truncate(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
