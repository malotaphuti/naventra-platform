package com.fleetops.dto.gps;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripTrackResponse {

    private Long tripId;
    private String tripNumber;
    private String status;
    private Place origin;
    private Place destination;
    private List<TrackPoint> points;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Place {
        private String name;
        private Double latitude;
        private Double longitude;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TrackPoint {
        private Double latitude;
        private Double longitude;
        private Double speedKmh;
        private LocalDateTime recordedAt;
    }
}
