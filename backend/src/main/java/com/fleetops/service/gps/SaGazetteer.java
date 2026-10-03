package com.fleetops.service.gps;

import java.util.List;
import java.util.Locale;

/**
 * Built-in geocoder for the free-text origin/destination of trips. There are no
 * real tracking devices or geocoding service, so places are resolved against a
 * small list of South African locations. Order matters: the first entry whose
 * keyword is contained in the text wins, so specific places precede the cities
 * that contain them (e.g. "Pretoria (Hatfield)" resolves to Hatfield).
 */
public final class SaGazetteer {

    public static final GeoPoint DEPOT = new GeoPoint(-26.2041, 28.0473);

    private record Place(double lat, double lng, String... keywords) {}

    private static final List<Place> PLACES = List.of(
            new Place(-26.1367, 28.2411, "or tambo", "airport", " ort "),
            new Place(-25.9385, 27.9261, "lanseria"),
            new Place(-29.8687, 31.0300, "durban harbour", "durban port"),
            new Place(-25.7487, 28.2380, "hatfield"),
            new Place(-25.7820, 28.2770, "menlyn"),
            new Place(-26.1000, 28.2333, "kempton park"),
            new Place(-26.1076, 28.0567, "sandton"),
            new Place(-26.1458, 28.0417, "rosebank"),
            new Place(-26.0936, 28.0064, "randburg"),
            new Place(-26.0129, 28.0059, "fourways"),
            new Place(-26.0570, 28.0228, "bryanston"),
            new Place(-26.1929, 28.0305, "braamfontein"),
            new Place(-25.9992, 28.1263, "midrand"),
            new Place(-25.8603, 28.1894, "centurion"),
            new Place(-26.2485, 27.8540, "soweto"),
            new Place(-26.1410, 28.1520, "edenvale"),
            new Place(-26.2178, 28.1672, "germiston"),
            new Place(-26.2125, 28.2626, "boksburg"),
            new Place(-26.1885, 28.3208, "benoni"),
            new Place(-26.2560, 28.4400, "springs"),
            new Place(-26.1625, 27.8725, "roodepoort"),
            new Place(-26.0852, 27.7748, "krugersdorp"),
            new Place(-26.6736, 27.9261, "vereeniging"),
            new Place(-26.7110, 27.8380, "vanderbijlpark"),
            new Place(-25.7469, 27.8496, "hartbeespoort"),
            new Place(-25.6676, 27.2421, "rustenburg"),
            new Place(-26.7145, 27.0970, "potchefstroom"),
            new Place(-26.8521, 26.6667, "klerksdorp"),
            new Place(-25.8560, 25.6403, "mahikeng", "mafikeng"),
            new Place(-23.9045, 29.4689, "polokwane", "pietersburg"),
            new Place(-25.4753, 30.9694, "mbombela", "nelspruit"),
            new Place(-25.8713, 29.2332, "witbank", "emalahleni"),
            new Place(-25.7700, 29.4648, "middelburg"),
            new Place(-29.8587, 31.0218, "durban"),
            new Place(-28.7807, 32.0383, "richards bay"),
            new Place(-29.6006, 30.3794, "pietermaritzburg"),
            new Place(-29.0852, 26.1596, "bloemfontein"),
            new Place(-27.9774, 26.7351, "welkom"),
            new Place(-28.7282, 24.7499, "kimberley"),
            new Place(-28.4478, 21.2561, "upington"),
            new Place(-33.9321, 18.8602, "stellenbosch"),
            new Place(-33.9249, 18.4241, "cape town"),
            new Place(-33.9608, 25.6022, "gqeberha", "port elizabeth"),
            new Place(-33.0153, 27.9116, "east london"),
            new Place(-33.9630, 22.4617, "george"),
            new Place(-25.7479, 28.2293, "pretoria", "tshwane"),
            new Place(-26.2041, 28.0473, "johannesburg", "jhb", "joburg", "jozi", "cbd")
    );

    private SaGazetteer() {
    }

    public static GeoPoint geocode(String text) {
        if (text == null || text.isBlank()) {
            return DEPOT;
        }
        String needle = " " + text.toLowerCase(Locale.ROOT) + " ";
        for (Place place : PLACES) {
            for (String keyword : place.keywords()) {
                if (needle.contains(keyword)) {
                    return new GeoPoint(place.lat(), place.lng());
                }
            }
        }
        // Unknown place: a stable point within ~25 km of Johannesburg so the same text always lands in the same spot.
        int h = text.trim().toLowerCase(Locale.ROOT).hashCode();
        double dLat = ((h & 0xFFFF) / 65535.0 - 0.5) * 0.45;
        double dLng = (((h >>> 16) & 0xFFFF) / 65535.0 - 0.5) * 0.45;
        return new GeoPoint(DEPOT.lat() + dLat, DEPOT.lng() + dLng);
    }

    /** Parking spot near HQ, spread per vehicle so markers don't overlap. */
    public static GeoPoint depotSpot(long vehicleId) {
        double angle = (vehicleId * 137.508) * Math.PI / 180.0;
        double radius = 0.0015 + (vehicleId % 7) * 0.0006;
        return new GeoPoint(DEPOT.lat() + radius * Math.sin(angle), DEPOT.lng() + radius * Math.cos(angle));
    }
}
