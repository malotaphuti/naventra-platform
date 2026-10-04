package com.fleetops.service.gps;

import com.fleetops.entity.Trip;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Simulates where a vehicle on an in-progress trip is right now, since the fleet
 * has no real tracking devices. Progress is driven by wall-clock time against an
 * estimated duration, so positions stay consistent across restarts.
 */
public final class RouteSimulator {

    private static final double ROAD_FACTOR = 1.25;
    private static final double AVERAGE_SPEED_KMH = 80.0;
    private static final double MIN_DURATION_MINUTES = 10.0;
    /** Only ending the trip completes it, so the simulated vehicle waits just short of the destination. */
    private static final double MAX_PROGRESS = 0.98;

    public record SimulatedPosition(GeoPoint point, double progress, double speedKmh, double headingDeg) {}

    private RouteSimulator() {
    }

    public static double estimatedDurationMinutes(GeoPoint origin, GeoPoint destination) {
        double roadKm = origin.distanceKm(destination) * ROAD_FACTOR;
        return Math.max(MIN_DURATION_MINUTES, roadKm / AVERAGE_SPEED_KMH * 60.0);
    }

    public static double progress(Trip trip, GeoPoint origin, GeoPoint destination, LocalDateTime now) {
        LocalDateTime startedAt = trip.getStartedAt() != null ? trip.getStartedAt() : now;
        double elapsedMinutes = Math.max(0, Duration.between(startedAt, now).toSeconds() / 60.0);
        return Math.min(MAX_PROGRESS, elapsedMinutes / estimatedDurationMinutes(origin, destination));
    }

    public static SimulatedPosition simulate(Trip trip, LocalDateTime now) {
        GeoPoint origin = SaGazetteer.geocode(trip.getOrigin());
        GeoPoint destination = SaGazetteer.geocode(trip.getDestination());
        double p = progress(trip, origin, destination, now);
        long seed = trip.getId() != null ? trip.getId() : 0L;

        GeoPoint point = pointAt(origin, destination, p, seed);
        GeoPoint ahead = pointAt(origin, destination, Math.min(1.0, p + 0.01), seed);
        double heading = point.equals(ahead) ? origin.bearingTo(destination) : point.bearingTo(ahead);

        double speed;
        if (p >= MAX_PROGRESS) {
            speed = 0.0;
        } else {
            double minutes = now.toLocalTime().toSecondOfDay() / 60.0;
            double cruise = 85.0 + 20.0 * Math.sin(minutes / 3.0 + seed);
            double jitter = ThreadLocalRandom.current().nextDouble(-5.0, 5.0);
            speed = Math.max(60.0, Math.min(110.0, cruise + jitter));
        }
        return new SimulatedPosition(point, p, round1(speed), round1(heading));
    }

    /**
     * Straight-line interpolation bent sideways by a sine curve so the track looks
     * like a road rather than a ruler line. The offset is zero at both ends.
     */
    public static GeoPoint pointAt(GeoPoint origin, GeoPoint destination, double p, long seed) {
        double dLat = destination.lat() - origin.lat();
        double dLng = destination.lng() - origin.lng();
        double length = Math.hypot(dLat, dLng);
        double lat = origin.lat() + dLat * p;
        double lng = origin.lng() + dLng * p;
        if (length < 1e-9) {
            return new GeoPoint(lat, lng);
        }
        double direction = (seed % 2 == 0) ? 1.0 : -1.0;
        double amplitude = Math.min(0.03, length * 0.06);
        double offset = direction * amplitude * (Math.sin(Math.PI * p) + 0.35 * Math.sin(3 * Math.PI * p));
        double perpLat = -dLng / length;
        double perpLng = dLat / length;
        return new GeoPoint(lat + perpLat * offset, lng + perpLng * offset);
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
