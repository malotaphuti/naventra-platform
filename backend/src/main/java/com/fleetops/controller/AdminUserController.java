package com.fleetops.controller;

import com.fleetops.dto.admin.AdminUserResponse;
import com.fleetops.dto.admin.UserCreateRequest;
import com.fleetops.dto.admin.UserUpdateRequest;
import com.fleetops.entity.enums.UserRole;
import com.fleetops.security.UserPrincipal;
import com.fleetops.service.AuditService;
import com.fleetops.service.UserAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/admin/users")
@RequiredArgsConstructor
@Tag(name = "User Administration", description = "System administrator user management")
public class AdminUserController {

    private final UserAdminService userAdminService;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Search users")
    public Page<AdminUserResponse> searchUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) Boolean enabled,
            @PageableDefault(size = 20, sort = "username", direction = Sort.Direction.ASC) Pageable pageable) {
        return userAdminService.searchUsers(search, role, enabled, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Get user by ID")
    public AdminUserResponse getUser(@PathVariable Long id) {
        return userAdminService.getUser(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a user (enabled, email verified)")
    public AdminUserResponse createUser(@Valid @RequestBody UserCreateRequest request) {
        AdminUserResponse response = userAdminService.createUser(request);
        auditService.annotate(null, null, response.getUsername() + " (" + response.getRole() + ")");
        return response;
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Update a user's name, email or role")
    public AdminUserResponse updateUser(@PathVariable Long id,
                                        @Valid @RequestBody UserUpdateRequest request,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        AdminUserResponse before = userAdminService.getUser(id);
        AdminUserResponse after = userAdminService.updateUser(id, request, principal.getUserId());
        if (before.getRole() != after.getRole()) {
            auditService.annotate("ROLE_CHANGE", before.getRole().name(), after.getRole().name());
        }
        return after;
    }

    @PatchMapping("/{id}/enabled")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Enable or disable a user")
    public AdminUserResponse setEnabled(@PathVariable Long id, @RequestParam boolean value,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        auditService.annotate(value ? "ENABLE" : "DISABLE", null, null);
        return userAdminService.setEnabled(id, value, principal.getUserId());
    }

    @PostMapping("/{id}/unlock")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Unlock a locked account")
    public AdminUserResponse unlock(@PathVariable Long id) {
        return userAdminService.unlock(id);
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Issue a new temporary password (e-mailed; user must change it at next sign-in)")
    public AdminUserResponse resetPassword(@PathVariable Long id) {
        return userAdminService.resetPassword(id);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Soft delete a user")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        userAdminService.softDelete(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }
}
