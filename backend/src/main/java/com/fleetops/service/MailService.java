package com.fleetops.service;

import com.fleetops.entity.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Sends account e-mails. Mail is optional: when no SMTP account is configured (MAIL_USERNAME empty),
 * {@link #isEnabled()} is false and callers fall back to showing the temporary password to the administrator.
 */
@Slf4j
@Service
public class MailService {

    private static final DateTimeFormatter EXPIRY_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm");

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String smtpUsername;
    private final String from;
    private final String appUrl;

    public MailService(ObjectProvider<JavaMailSender> mailSender,
                       @Value("${spring.mail.username:}") String smtpUsername,
                       @Value("${fleetops.mail.from:}") String from,
                       @Value("${fleetops.app-url}") String appUrl) {
        this.mailSender = mailSender;
        this.smtpUsername = smtpUsername;
        this.from = StringUtils.hasText(from) ? from : smtpUsername;
        this.appUrl = appUrl.replaceAll("/+$", "");
    }

    public boolean isEnabled() {
        return StringUtils.hasText(smtpUsername) && mailSender.getIfAvailable() != null;
    }

    /**
     * E-mails the user their username and temporary password. Never logs the password.
     *
     * @return true if the message was handed to the SMTP server
     */
    public boolean sendCredentials(User user, String temporaryPassword, LocalDateTime expiresAt, boolean reset) {
        if (!isEnabled()) {
            log.info("Mail not configured - temporary password for {} must be shared by the administrator",
                    user.getUsername());
            return false;
        }
        String subject = reset ? "Your FleetOps password has been reset" : "Your FleetOps account is ready";
        String intro = reset
                ? "An administrator has reset your FleetOps password."
                : "An account has been created for you on FleetOps.";
        String expiry = expiresAt.format(EXPIRY_FORMAT);

        String text = """
                Hi %s,

                %s

                Sign in at: %s
                Username:   %s
                Temporary password: %s

                This temporary password expires on %s. You'll be asked to choose your own password the first
                time you sign in.

                If you weren't expecting this e-mail, please contact your administrator.
                """.formatted(user.getFullName(), intro, appUrl, user.getUsername(), temporaryPassword, expiry);

        String html = """
                <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;max-width:520px;color:#0f172a">
                  <h2 style="color:#0d9488;margin:0 0 12px">FleetOps</h2>
                  <p>Hi %s,</p>
                  <p>%s</p>
                  <table style="border-collapse:collapse;margin:16px 0">
                    <tr><td style="padding:6px 12px 6px 0;color:#64748b">Username</td>
                        <td style="padding:6px 0"><b>%s</b></td></tr>
                    <tr><td style="padding:6px 12px 6px 0;color:#64748b">Temporary password</td>
                        <td style="padding:6px 0;font-family:Consolas,monospace;font-size:15px"><b>%s</b></td></tr>
                  </table>
                  <p><a href="%s" style="background:#0d9488;color:#fff;padding:10px 18px;border-radius:8px;
                     text-decoration:none;display:inline-block">Sign in to FleetOps</a></p>
                  <p style="color:#64748b;font-size:13px">This temporary password expires on %s. You'll be asked
                     to choose your own password the first time you sign in.<br>
                     If you weren't expecting this e-mail, please contact your administrator.</p>
                </div>
                """.formatted(HtmlUtils.htmlEscape(user.getFullName()), intro, HtmlUtils.htmlEscape(user.getUsername()),
                HtmlUtils.htmlEscape(temporaryPassword), appUrl, expiry);

        try {
            MimeMessage message = mailSender.getObject().createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(user.getEmail());
            helper.setSubject(subject);
            helper.setText(text, html);
            mailSender.getObject().send(message);
            log.info("Credentials e-mail sent to user {}", user.getUsername());
            return true;
        } catch (MailException | MessagingException e) {
            log.warn("Could not send credentials e-mail to user {}: {}", user.getUsername(), e.getMessage());
            return false;
        }
    }
}
