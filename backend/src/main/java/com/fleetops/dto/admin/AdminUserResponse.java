package com.fleetops.dto.admin;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fleetops.entity.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserResponse {

    private Long id;
    private String username;
    private String email;
    private String fullName;
    private UserRole role;
    private boolean enabled;
    private boolean emailVerified;
    private boolean accountLocked;
    private LocalDateTime lockedUntil;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
    private boolean hasDriverProfile;
    private boolean mustChangePassword;

    /** Only on create / reset-password responses: how the temporary password was delivered. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private CredentialsDelivery credentials;
}
