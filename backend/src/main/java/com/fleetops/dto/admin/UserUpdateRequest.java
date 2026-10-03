package com.fleetops.dto.admin;

import com.fleetops.entity.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Null fields are left unchanged. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateRequest {

    @Size(min = 1, max = 100, message = "Full name must be between 1 and 100 characters")
    private String fullName;

    @Email(message = "Invalid email format")
    private String email;

    private UserRole role;
}
