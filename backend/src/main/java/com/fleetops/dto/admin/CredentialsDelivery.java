package com.fleetops.dto.admin;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * How a temporary password reached the user. {@code temporaryPassword} is only present when e-mail
 * could not be sent - the administrator then sees it once and passes it on.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CredentialsDelivery {

    private boolean credentialsEmailed;
    private String emailedTo;
    private String temporaryPassword;
    private LocalDateTime temporaryPasswordExpiresAt;
}
