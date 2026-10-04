package com.fleetops.service;

import com.fleetops.dto.auth.*;
import com.fleetops.entity.User;
import com.fleetops.entity.enums.UserRole;
import com.fleetops.exception.AccountLockedException;
import com.fleetops.exception.BusinessRuleException;
import com.fleetops.exception.EntityNotFoundException;
import com.fleetops.repository.UserRepository;
import com.fleetops.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final TokenStoreService tokenStore;

    @Value("${fleetops.security.max-failed-attempts}")
    private int maxFailedAttempts;

    @Value("${fleetops.security.lock-duration-minutes}")
    private int lockDurationMinutes;

    @Transactional
    public AuthResponse authenticate(LoginRequest request) {
        User user = userRepository.findByUsernameAndDeletedFalse(request.getUsername())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        // Check account lock
        if (user.isAccountLocked()) {
            if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
                throw new AccountLockedException(
                        "Account locked until " + user.getLockedUntil());
            }
            // Lock period expired, unlock
            user.setAccountLocked(false);
            user.setFailedLoginAttempts(0);
        }

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);

            if (attempts >= maxFailedAttempts) {
                user.setAccountLocked(true);
                user.setLockedUntil(LocalDateTime.now().plusMinutes(lockDurationMinutes));
                userRepository.save(user);
                throw new AccountLockedException(
                        "Account locked due to too many failed attempts");
            }

            userRepository.save(user);
            throw new BadCredentialsException("Invalid credentials");
        }

        if (!user.isEnabled()) {
            throw new BusinessRuleException("Account is disabled. Contact your administrator.");
        }

        if (user.isMustChangePassword() && user.getTempPasswordExpiresAt() != null
                && user.getTempPasswordExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessRuleException(
                    "Your temporary password has expired. Ask your administrator to reset it.");
        }

        // Check if email is verified
        if (!user.isEmailVerified()) {
            throw new BusinessRuleException("Email not verified. Please verify your email first.");
        }

        // Successful login
        user.setFailedLoginAttempts(0);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String accessToken = jwtProvider.generateAccessToken(user);
        String refreshToken = jwtProvider.generateRefreshToken(user);

        // Store refresh token
        tokenStore.storeToken(
                "refresh:" + user.getId(),
                refreshToken,
                Duration.ofSeconds(jwtProvider.getRefreshTokenExpiry()));

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtProvider.getAccessTokenExpiry())
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .role(user.getRole())
                        .mustChangePassword(user.isMustChangePassword())
                        .build())
                .build();
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String token = request.getRefreshToken();

        if (!jwtProvider.validateToken(token)) {
            throw new BadCredentialsException("Invalid refresh token");
        }

        Long userId = jwtProvider.extractUserId(token);
        String storedToken = tokenStore.getToken("refresh:" + userId);

        if (storedToken == null || !storedToken.equals(token)) {
            throw new BadCredentialsException("Refresh token has been revoked");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User", userId));
        if (!user.isEnabled() || user.isDeleted()) {
            throw new BadCredentialsException("Account is disabled");
        }

        // Generate new tokens (token rotation)
        String newAccessToken = jwtProvider.generateAccessToken(user);
        String newRefreshToken = jwtProvider.generateRefreshToken(user);

        // Replace stored refresh token
        tokenStore.storeToken(
                "refresh:" + user.getId(),
                newRefreshToken,
                Duration.ofSeconds(jwtProvider.getRefreshTokenExpiry()));

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .expiresIn(jwtProvider.getAccessTokenExpiry())
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .role(user.getRole())
                        .mustChangePassword(user.isMustChangePassword())
                        .build())
                .build();
    }

    public void logout(Long userId) {
        tokenStore.deleteToken("refresh:" + userId);
    }

    @Transactional
    public void register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessRuleException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessRuleException("Email already in use");
        }

        String verificationToken = UUID.randomUUID().toString();

        User user = User.builder()
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .fullName(request.getFullName())
                .role(request.getRole())
                .enabled(true)
                .emailVerified(false)
                .verificationToken(verificationToken)
                .build();

        userRepository.save(user);

        // TODO: Send verification email via NotificationService
        log.info("User registered: {}. Verification token: {}", user.getUsername(), verificationToken);
    }

    @Transactional
    public void verifyEmail(String verificationToken) {
        User user = userRepository.findByVerificationToken(verificationToken)
                .orElseThrow(() -> new BusinessRuleException("Invalid verification token"));

        user.setEmailVerified(true);
        user.setVerificationToken(null);
        userRepository.save(user);
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmailAndDeletedFalse(request.getEmail()).ifPresent(user -> {
            String resetToken = UUID.randomUUID().toString();
            user.setPasswordResetToken(resetToken);
            user.setPasswordResetTokenExpiry(LocalDateTime.now().plusHours(1));
            userRepository.save(user);

            // TODO: Send password reset email via NotificationService
            log.info("Password reset requested for: {}. Token: {}", user.getEmail(), resetToken);
        });
        // Always return success to avoid email enumeration
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByPasswordResetToken(request.getToken())
                .orElseThrow(() -> new BusinessRuleException("Invalid password reset token"));

        if (user.getPasswordResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new BusinessRuleException("Password reset token has expired");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        user.setFailedLoginAttempts(0);
        user.setAccountLocked(false);
        userRepository.save(user);
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User", userId));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException("Choose a new password that is different from the current one");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        user.setTempPasswordExpiresAt(null);
        userRepository.save(user);

        // Invalidate refresh token to force re-login
        tokenStore.deleteToken("refresh:" + userId);
    }
}
