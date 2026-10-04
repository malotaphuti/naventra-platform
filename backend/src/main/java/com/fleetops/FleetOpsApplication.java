package com.fleetops;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
public class FleetOpsApplication {

    public static void main(String[] args) {
        // Business times (fuel slips, incidents, trip events) are entered and shown in local fleet time.
        // Containers default to UTC, which would put "now" two hours behind a South African browser.
        String zone = System.getenv().getOrDefault("FLEETOPS_TIMEZONE", "Africa/Johannesburg");
        TimeZone.setDefault(TimeZone.getTimeZone(zone));
        SpringApplication.run(FleetOpsApplication.class, args);
    }
}
