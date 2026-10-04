package com.fleetops.dto.admin;

/** Mirrors the rule in {@code RegisterRequest} / {@code ChangePasswordRequest}. */
public final class PasswordPolicy {

    public static final String REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+$";
    public static final String MESSAGE =
            "Password must contain at least one uppercase, one lowercase, one digit, and one special character (@$!%*?&)";

    private PasswordPolicy() {
    }
}
