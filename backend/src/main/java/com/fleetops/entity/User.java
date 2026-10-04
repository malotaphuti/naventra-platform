package com.fleetops.entity;

import com.fleetops.entity.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(nullable = false)
    private String passwordHash;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Builder.Default
    private boolean enabled = true;

    @Builder.Default
    private boolean emailVerified = false;

    @Builder.Default
    private boolean accountLocked = false;

    @Builder.Default
    private int failedLoginAttempts = 0;

    private LocalDateTime lastLoginAt;

    private LocalDateTime lockedUntil;

    private String verificationToken;

    private String passwordResetToken;

    private LocalDateTime passwordResetTokenExpiry;

    /** Set when an administrator issued a temporary password; cleared once the user picks their own. */
    @Builder.Default
    private boolean mustChangePassword = false;

    private LocalDateTime tempPasswordExpiresAt;

    @Builder.Default
    private boolean deleted = false;
}
