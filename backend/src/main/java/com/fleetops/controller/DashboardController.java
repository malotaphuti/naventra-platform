package com.fleetops.controller;

import com.fleetops.dto.dashboard.DashboardResponse;
import com.fleetops.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Fleet overview and KPIs")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/overview")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'EXECUTIVE')")
    @Operation(summary = "Get fleet overview dashboard data")
    public DashboardResponse getOverview() {
        return dashboardService.getFleetOverview();
    }
}
