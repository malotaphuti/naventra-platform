package com.fleetops.controller;

import com.fleetops.dto.dashboard.DashboardResponse;
import com.fleetops.dto.dashboard.DriverDashboardResponse;
import com.fleetops.dto.dashboard.MaintenanceDashboardResponse;
import com.fleetops.security.UserPrincipal;
import com.fleetops.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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

    @GetMapping("/driver")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Get the authenticated driver's personal dashboard")
    public DriverDashboardResponse getDriverDashboard(@AuthenticationPrincipal UserPrincipal principal) {
        return dashboardService.getDriverDashboard(principal.getUserId());
    }

    @GetMapping("/maintenance")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_OFFICER')")
    @Operation(summary = "Get workshop dashboard: downtime, service schedule and work orders")
    public MaintenanceDashboardResponse getMaintenanceDashboard() {
        return dashboardService.getMaintenanceDashboard();
    }
}
