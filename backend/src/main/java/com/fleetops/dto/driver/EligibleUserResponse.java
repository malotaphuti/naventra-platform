package com.fleetops.dto.driver;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EligibleUserResponse {

    private Long id;
    private String username;
    private String fullName;
    private String email;
}
