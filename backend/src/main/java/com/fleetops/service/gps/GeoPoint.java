package com.fleetops.service.gps;

public record GeoPoint(double lat, double lng) {

    private static final double EARTH_RADIUS_KM = 6371.0;

    public double distanceKm(GeoPoint other) {
        double dLat = Math.toRadians(other.lat - lat);
        double dLng = Math.toRadians(other.lng - lng);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat)) * Math.cos(Math.toRadians(other.lat))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /** Initial compass bearing (0 = north, clockwise) towards {@code other}. */
    public double bearingTo(GeoPoint other) {
        double phi1 = Math.toRadians(lat);
        double phi2 = Math.toRadians(other.lat);
        double dLng = Math.toRadians(other.lng - lng);
        double y = Math.sin(dLng) * Math.cos(phi2);
        double x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
        return (Math.toDegrees(Math.atan2(y, x)) + 360.0) % 360.0;
    }
}
