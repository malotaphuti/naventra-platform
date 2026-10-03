package com.fleetops.service;

import com.fleetops.dto.admin.AdminUserResponse;
import com.fleetops.dto.admin.UserCreateRequest;
import com.fleetops.dto.admin.UserUpdateRequest;
import com.fleetops.entity.User;
import com.fleetops.entity.enums.UserRole;
import com.fleetops.exception.BusinessRuleException;
import com.fleetops.exception.EntityNotFoundException;
import com.fleetops.repository.DriverRepository;
import com.fleetops.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserAdminService {

    private final UserRepository userRepository;
    private final DriverRepository driverRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenStoreService tokenStore;

    @Transactional(readOnly = true)
    public Page<AdminUserResponse> searchUsers(String search, UserRole role, Boolean enabled, Pageable pageable) {
        Specification<User> spec = (root, query, cb) -> cb.equal(root.get("deleted"), false);

        if (StringUtils.hasText(search)) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("username")), pattern),
                    cb.like(cb.lower(root.get("fullName")), pattern),
                    cb.like(cb.lower(root.get("email")), pattern)
            ));
        }
        if (role != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("role"), role));
        }
        if (enabled != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("enabled"), enabled));
        }

        return userRepository.findAll(spec, pageable).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public AdminUserResponse getUser(Long id) {
        return mapToResponse(findUser(id));
    }

    @Transactional
    public AdminUserResponse createUser(UserCreateRequest request) {
        String username = request.getUsername().trim();
        String email = request.getEmail().trim();
        if (userRepository.existsByUsername(username)) {
            throw new BusinessRuleException("Username '" + username + "' is already taken");
        }
        if (userRepository.existsByEmail(email)) {
            throw new BusinessRuleException("Email '" + email + "' is already in use");
        }

        User user = User.builder()
                .username(username)
                .email(email)
                .fullName(request.getFullName().trim())
                .role(request.getRole())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .enabled(true)
                .emailVerified(true)
                .build();

        user = userRepository.save(user);
        log.info("User created by admin: {} ({})", user.getUsername(), user.getRole());
        return mapToResponse(user);
    }

    @Transactional
    public AdminUserResponse updateUser(Long id, UserUpdateRequest request, Long actingUserId) {
        User user = findUser(id);

        if (StringUtils.hasText(request.getFullName())) {
            user.setFullName(request.getFullName().trim());
        }
        if (StringUtils.hasText(request.getEmail())) {
            String email = request.getEmail().trim();
            if (!email.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmailAndIdNot(email, id)) {
                throw new BusinessRuleException("Email '" + email + "' is already in use");
            }
            user.setEmail(email);
        }
        if (request.getRole() != null && request.getRole() != user.getRole()) {
            if (id.equals(actingUserId)) {
                throw new BusinessRuleException("You cannot change your own role");
            }
            if (user.getRole() == UserRole.DRIVER && driverRepository.existsByUserIdAndDeletedFalse(id)) {
                throw new BusinessRuleException("User '" + user.getUsername()
                        + "' has a driver profile; delete the driver profile before changing the role");
            }
            user.setRole(request.getRole());
            // The role is embedded in issued tokens, so force a fresh login.
            tokenStore.deleteToken("refresh:" + id);
        }

        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    public AdminUserResponse setEnabled(Long id, boolean enabled, Long actingUserId) {
        User user = findUser(id);
        if (!enabled && id.equals(actingUserId)) {
            throw new BusinessRuleException("You cannot disable your own account");
        }
        user.setEnabled(enabled);
        if (!enabled) {
            tokenStore.deleteToken("refresh:" + id);
        }
        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    public AdminUserResponse unlock(Long id) {
        User user = findUser(id);
        user.setAccountLocked(false);
        user.setLockedUntil(null);
        user.setFailedLoginAttempts(0);
        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    public void resetPassword(Long id, String newPassword) {
        User user = findUser(id);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setFailedLoginAttempts(0);
        user.setAccountLocked(false);
        user.setLockedUntil(null);
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        userRepository.save(user);
        tokenStore.deleteToken("refresh:" + id);
        log.info("Password reset by admin for user {}", user.getUsername());
    }

    @Transactional
    public void softDelete(Long id, Long actingUserId) {
        User user = findUser(id);
        if (id.equals(actingUserId)) {
            throw new BusinessRuleException("You cannot delete your own account");
        }
        if (driverRepository.existsByUserIdAndDeletedFalse(id)) {
            throw new BusinessRuleException("User '" + user.getUsername()
                    + "' has a driver profile; delete the driver first");
        }
        user.setDeleted(true);
        user.setEnabled(false);
        userRepository.save(user);
        tokenStore.deleteToken("refresh:" + id);
        log.info("User soft deleted: {}", user.getUsername());
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new EntityNotFoundException("User", id));
    }

    private AdminUserResponse mapToResponse(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .enabled(user.isEnabled())
                .emailVerified(user.isEmailVerified())
                .accountLocked(user.isAccountLocked())
                .lockedUntil(user.getLockedUntil())
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .hasDriverProfile(driverRepository.existsByUserIdAndDeletedFalse(user.getId()))
                .build();
    }
}
