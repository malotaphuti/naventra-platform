package com.fleetops.service;

import com.fleetops.dto.admin.CredentialsDelivery;
import com.fleetops.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Issues one-time temporary passwords for accounts created or reset by an administrator / fleet manager,
 * and delivers them by e-mail. The user must replace the password at first sign-in, and it expires.
 */
@Service
@RequiredArgsConstructor
public class CredentialService {

    // No look-alike characters (0/O, 1/l/I) so the password can be read from an e-mail or screen without mistakes
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String SPECIAL = "@$!%*?&";   // the set allowed by PasswordPolicy
    private static final int LENGTH = 14;

    private final SecureRandom random = new SecureRandom();
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    @Value("${fleetops.security.temp-password-hours:72}")
    private int tempPasswordHours;

    /**
     * Gives the user a fresh temporary password (hashed on the entity) and flags the account so the user must
     * change it at first sign-in. The caller saves the user, then calls {@link #deliver}.
     *
     * @return the plain temporary password - only ever e-mailed or shown once, never stored or logged
     */
    public String issueTemporaryPassword(User user) {
        String password = generate();
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setMustChangePassword(true);
        user.setTempPasswordExpiresAt(LocalDateTime.now().plusHours(tempPasswordHours));
        user.setFailedLoginAttempts(0);
        user.setAccountLocked(false);
        user.setLockedUntil(null);
        return password;
    }

    /**
     * E-mails the credentials. If e-mail isn't configured or fails, the temporary password is returned in the
     * result so the administrator can pass it on once (it is not stored anywhere).
     */
    public CredentialsDelivery deliver(User user, String temporaryPassword, boolean reset) {
        boolean emailed = mailService.sendCredentials(user, temporaryPassword, user.getTempPasswordExpiresAt(), reset);
        return CredentialsDelivery.builder()
                .credentialsEmailed(emailed)
                .emailedTo(emailed ? user.getEmail() : null)
                .temporaryPassword(emailed ? null : temporaryPassword)
                .temporaryPasswordExpiresAt(user.getTempPasswordExpiresAt())
                .build();
    }

    String generate() {
        List<Character> chars = new ArrayList<>(LENGTH);
        chars.add(pick(UPPER));
        chars.add(pick(LOWER));
        chars.add(pick(DIGITS));
        chars.add(pick(SPECIAL));
        String all = UPPER + LOWER + DIGITS + SPECIAL;
        while (chars.size() < LENGTH) {
            chars.add(pick(all));
        }
        Collections.shuffle(chars, random);
        StringBuilder sb = new StringBuilder(LENGTH);
        chars.forEach(sb::append);
        return sb.toString();
    }

    private char pick(String alphabet) {
        return alphabet.charAt(random.nextInt(alphabet.length()));
    }
}
