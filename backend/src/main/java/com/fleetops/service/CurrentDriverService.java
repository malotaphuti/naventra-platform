package com.fleetops.service;

import com.fleetops.entity.Driver;
import com.fleetops.entity.enums.UserRole;
import com.fleetops.exception.BusinessRuleException;
import com.fleetops.repository.DriverRepository;
import com.fleetops.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resolves the driver profile behind a DRIVER login, so services can scope data to "my own records".
 * Other roles are unrestricted and get {@code null}.
 */
@Service
@RequiredArgsConstructor
public class CurrentDriverService {

    private final DriverRepository driverRepository;

    /** The caller's driver id when they are a DRIVER, otherwise null. */
    @Transactional(readOnly = true)
    public Long ownDriverIdIfDriver(UserPrincipal principal) {
        if (principal == null || principal.getRole() != UserRole.DRIVER) {
            return null;
        }
        return driverRepository.findByUserIdAndDeletedFalse(principal.getUserId())
                .map(Driver::getId)
                .orElseThrow(() -> new AccessDeniedException("No driver profile is linked to your account"));
    }

    /**
     * For a DRIVER, returns their own driver id (rejecting any attempt to act as someone else).
     * For other roles, returns the requested id, which must be present.
     */
    public Long resolveDriverId(UserPrincipal principal, Long requestedDriverId) {
        Long ownDriverId = ownDriverIdIfDriver(principal);
        if (ownDriverId != null) {
            if (requestedDriverId != null && !requestedDriverId.equals(ownDriverId)) {
                throw new AccessDeniedException("Drivers can only act on their own records");
            }
            return ownDriverId;
        }
        if (requestedDriverId == null) {
            throw new BusinessRuleException("Driver is required");
        }
        return requestedDriverId;
    }

    /** Throws 403 when a DRIVER touches a record that belongs to another driver. */
    public void assertOwnRecord(UserPrincipal principal, Long recordDriverId) {
        Long ownDriverId = ownDriverIdIfDriver(principal);
        if (ownDriverId != null && !ownDriverId.equals(recordDriverId)) {
            throw new AccessDeniedException("You can only access your own records");
        }
    }
}
