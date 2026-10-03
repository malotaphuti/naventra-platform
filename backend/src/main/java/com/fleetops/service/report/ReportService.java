package com.fleetops.service.report;

import com.fleetops.dto.report.ReportDefinition;
import com.fleetops.dto.report.ReportResponse;
import com.fleetops.entity.*;
import com.fleetops.entity.enums.IncidentStatus;
import com.fleetops.entity.enums.WorkOrderStatus;
import com.fleetops.exception.BusinessRuleException;
import com.fleetops.exception.EntityNotFoundException;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Builds the tabular operational reports. Queries go through the EntityManager so
 * reporting stays independent of the feature repositories.
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final int MAX_RANGE_DAYS = 3660;

    private final EntityManager entityManager;

    private record Range(LocalDate from, LocalDate to) {
        LocalDateTime start() { return from.atStartOfDay(); }
        LocalDateTime end() { return to.plusDays(1).atStartOfDay(); }
        long days() { return ChronoUnit.DAYS.between(from, to) + 1; }
        boolean contains(LocalDateTime t) { return t != null && !t.isBefore(start()) && t.isBefore(end()); }
        boolean contains(LocalDate d) { return d != null && !d.isBefore(from) && !d.isAfter(to); }
    }

    private record Table(List<String> columns, List<List<Object>> rows) {}

    private record Report(ReportDefinition definition, Function<Range, Table> builder) {}

    private final Map<String, Report> reports = new LinkedHashMap<>();

    {
        register("fleet-utilization", "Fleet Utilization",
                "Trips, distance and days in use per vehicle", this::fleetUtilization);
        register("driver-performance", "Driver Performance",
                "Trips, distance, fuel efficiency and incidents per driver", this::driverPerformance);
        register("maintenance-history", "Maintenance History",
                "Work orders with dates and costs", this::maintenanceHistory);
        register("fuel-consumption", "Fuel Consumption",
                "Litres, spend and efficiency per vehicle", this::fuelConsumption);
        register("trip-summary", "Trip Summary",
                "All trips requested in the period", this::tripSummary);
        register("vehicle-downtime", "Vehicle Downtime",
                "Days off the road for maintenance per vehicle", this::vehicleDowntime);
        register("incident-report", "Incident Report",
                "Incidents with severity, status and resolution time", this::incidentReport);
        register("cost-analysis", "Cost Analysis",
                "Fuel and maintenance cost per vehicle and per km", this::costAnalysis);
    }

    private void register(String key, String title, String description, Function<Range, Table> builder) {
        reports.put(key, new Report(new ReportDefinition(key, title, description), builder));
    }

    public List<ReportDefinition> listReports() {
        return reports.values().stream().map(Report::definition).toList();
    }

    @Transactional(readOnly = true)
    public ReportResponse generate(String key, LocalDate from, LocalDate to) {
        Report report = reports.get(key);
        if (report == null) {
            throw new EntityNotFoundException("Report", key);
        }
        LocalDate today = LocalDate.now();
        LocalDate effectiveFrom = from != null ? from : today.withDayOfMonth(1);
        LocalDate effectiveTo = to != null ? to : today;
        if (effectiveTo.isBefore(effectiveFrom)) {
            throw new BusinessRuleException("'to' date must be on or after 'from' date");
        }
        Range range = new Range(effectiveFrom, effectiveTo);
        if (range.days() > MAX_RANGE_DAYS) {
            throw new BusinessRuleException("Date range may not exceed 10 years");
        }
        Table table = report.builder().apply(range);
        return ReportResponse.builder()
                .key(key)
                .title(report.definition().title())
                .description(report.definition().description())
                .from(effectiveFrom)
                .to(effectiveTo)
                .columns(table.columns())
                .rows(table.rows())
                .generatedAt(LocalDateTime.now())
                .build();
    }

    // ---------------------------------------------------------------- reports

    private Table fleetUtilization(Range range) {
        List<Vehicle> vehicles = vehicles();
        Map<Long, List<Trip>> tripsByVehicle = tripsActiveIn(range).stream()
                .collect(Collectors.groupingBy(t -> t.getVehicle().getId()));
        LocalDateTime now = LocalDateTime.now();

        List<List<Object>> rows = new ArrayList<>();
        for (Vehicle v : vehicles) {
            List<Trip> trips = tripsByVehicle.getOrDefault(v.getId(), List.of());
            long started = trips.stream().filter(t -> range.contains(t.getStartedAt())).count();
            long km = trips.stream().filter(t -> range.contains(t.getCompletedAt())).mapToLong(this::tripKm).sum();
            Set<LocalDate> tripDays = new HashSet<>();
            for (Trip t : trips) {
                LocalDateTime end = t.getCompletedAt() != null ? t.getCompletedAt() : now;
                addDays(tripDays, t.getStartedAt().toLocalDate(), end.toLocalDate(), range);
            }
            rows.add(row(v.getRegistrationNumber(), vehicleName(v), humanize(v.getStatus()),
                    started, km, tripDays.size(), pct(tripDays.size(), range.days())));
        }
        return new Table(List.of("Registration", "Vehicle", "Status", "Trips started", "Km driven",
                "Days on trip", "Utilisation %"), rows);
    }

    private Table driverPerformance(Range range) {
        List<Driver> drivers = entityManager.createQuery(
                        "SELECT d FROM Driver d JOIN FETCH d.user WHERE d.deleted = false ORDER BY d.employeeNumber",
                        Driver.class)
                .getResultList();
        Map<Long, List<Trip>> completed = tripsCompletedIn(range).stream()
                .collect(Collectors.groupingBy(t -> t.getDriver().getId()));
        Map<Long, List<FuelEntry>> fuel = fuelIn(range).stream()
                .collect(Collectors.groupingBy(f -> f.getDriver().getId()));
        Map<Long, Long> incidents = incidentsIn(range).stream()
                .collect(Collectors.groupingBy(i -> i.getDriver().getId(), Collectors.counting()));

        List<List<Object>> rows = new ArrayList<>();
        for (Driver d : drivers) {
            List<Trip> trips = completed.getOrDefault(d.getId(), List.of());
            long km = trips.stream().mapToLong(this::tripKm).sum();
            List<FuelEntry> entries = fuel.getOrDefault(d.getId(), List.of());
            double litres = litres(entries);
            rows.add(row(d.getUser().getFullName(), d.getEmployeeNumber(), humanize(d.getStatus()),
                    trips.size(), km, round(litres, 1), money(fuelCost(entries)),
                    litres > 0 && km > 0 ? round(km / litres, 2) : null,
                    incidents.getOrDefault(d.getId(), 0L)));
        }
        return new Table(List.of("Driver", "Employee #", "Status", "Trips completed", "Km",
                "Fuel (L)", "Fuel cost (R)", "Km per litre", "Incidents"), rows);
    }

    private Table maintenanceHistory(Range range) {
        List<List<Object>> rows = workOrders().stream()
                .filter(wo -> range.contains(wo.getScheduledDate()) || range.contains(wo.getStartedDate())
                        || range.contains(wo.getCompletedDate()) || range.contains(wo.getCreatedAt()))
                .sorted(Comparator.comparing(this::workOrderDate).thenComparing(WorkOrder::getWorkOrderNumber))
                .map(wo -> row(wo.getWorkOrderNumber(), wo.getVehicle().getRegistrationNumber(),
                        humanize(wo.getType()), humanize(wo.getStatus()), date(wo.getScheduledDate()),
                        date(wo.getStartedDate()), date(wo.getCompletedDate()), money(wo.getLabourCost()),
                        money(wo.getPartsCost()), money(workOrderCost(wo))))
                .toList();
        return new Table(List.of("WO #", "Vehicle", "Type", "Status", "Scheduled", "Started", "Completed",
                "Labour (R)", "Parts (R)", "Total (R)"), rows);
    }

    private Table fuelConsumption(Range range) {
        Map<Long, List<FuelEntry>> fuel = fuelIn(range).stream()
                .collect(Collectors.groupingBy(f -> f.getVehicle().getId()));
        Map<Long, Long> kmByVehicle = kmByVehicle(range);

        List<List<Object>> rows = new ArrayList<>();
        for (Vehicle v : vehicles()) {
            List<FuelEntry> entries = fuel.getOrDefault(v.getId(), List.of());
            double litres = litres(entries);
            BigDecimal cost = fuelCost(entries);
            long km = kmByVehicle.getOrDefault(v.getId(), 0L);
            rows.add(row(v.getRegistrationNumber(), vehicleName(v), entries.size(), round(litres, 1), money(cost),
                    litres > 0 ? money(cost.divide(BigDecimal.valueOf(litres), 2, RoundingMode.HALF_UP)) : null,
                    km,
                    litres > 0 && km > 0 ? round(km / litres, 2) : null,
                    km > 0 ? money(cost.divide(BigDecimal.valueOf(km), 2, RoundingMode.HALF_UP)) : null));
        }
        return new Table(List.of("Registration", "Vehicle", "Fill-ups", "Litres", "Fuel cost (R)",
                "Avg R/L", "Km", "Km/L", "R/km"), rows);
    }

    private Table tripSummary(Range range) {
        List<Trip> trips = entityManager.createQuery(
                        "SELECT t FROM Trip t JOIN FETCH t.vehicle JOIN FETCH t.driver d JOIN FETCH d.user " +
                        "WHERE t.deleted = false AND COALESCE(t.requestedAt, t.createdAt) >= :start " +
                        "AND COALESCE(t.requestedAt, t.createdAt) < :end " +
                        "ORDER BY COALESCE(t.requestedAt, t.createdAt)", Trip.class)
                .setParameter("start", range.start())
                .setParameter("end", range.end())
                .getResultList();
        List<List<Object>> rows = trips.stream()
                .map(t -> row(t.getTripNumber(),
                        dateTime(t.getRequestedAt() != null ? t.getRequestedAt() : t.getCreatedAt()),
                        t.getDriver().getUser().getFullName(), t.getVehicle().getRegistrationNumber(),
                        t.getOrigin(), t.getDestination(), humanize(t.getStatus()),
                        dateTime(t.getStartedAt()), dateTime(t.getCompletedAt()),
                        t.getCompletedAt() != null ? tripKm(t) : null))
                .toList();
        return new Table(List.of("Trip #", "Requested", "Driver", "Vehicle", "Origin", "Destination", "Status",
                "Started", "Completed", "Km"), rows);
    }

    private Table vehicleDowntime(Range range) {
        LocalDate today = LocalDate.now();
        Map<Long, List<WorkOrder>> byVehicle = workOrders().stream()
                .filter(wo -> wo.getStatus() != WorkOrderStatus.CANCELLED)
                .collect(Collectors.groupingBy(wo -> wo.getVehicle().getId()));

        List<List<Object>> rows = new ArrayList<>();
        for (Vehicle v : vehicles()) {
            int count = 0;
            Set<LocalDate> downDays = new HashSet<>();
            for (WorkOrder wo : byVehicle.getOrDefault(v.getId(), List.of())) {
                LocalDate start = downtimeStart(wo);
                if (start == null) {
                    continue;
                }
                LocalDate end = wo.getCompletedDate() != null ? wo.getCompletedDate() : today;
                if (end.isBefore(range.from()) || start.isAfter(range.to())) {
                    continue;
                }
                count++;
                addDays(downDays, start, end, range);
            }
            double availability = 100.0 - pct(downDays.size(), range.days());
            rows.add(row(v.getRegistrationNumber(), vehicleName(v), humanize(v.getStatus()), count,
                    downDays.size(), round(availability, 1)));
        }
        rows.sort(Comparator.comparing((List<Object> r) -> ((Number) r.get(4)).intValue()).reversed());
        return new Table(List.of("Registration", "Vehicle", "Current status", "Work orders", "Downtime days",
                "Availability %"), rows);
    }

    private Table incidentReport(Range range) {
        List<List<Object>> rows = incidentsIn(range).stream()
                .sorted(Comparator.comparing(this::incidentDate))
                .map(i -> {
                    boolean resolved = i.getStatus() == IncidentStatus.RESOLVED || i.getStatus() == IncidentStatus.CLOSED;
                    Double hours = resolved && i.getCreatedAt() != null && i.getUpdatedAt() != null
                            ? round(Duration.between(i.getCreatedAt(), i.getUpdatedAt()).toMinutes() / 60.0, 1)
                            : null;
                    return row(i.getIncidentNumber(), dateTime(incidentDate(i)),
                            i.getVehicle().getRegistrationNumber(), i.getDriver().getUser().getFullName(),
                            humanize(i.getType()), humanize(i.getSeverity()), humanize(i.getStatus()), hours);
                })
                .toList();
        return new Table(List.of("INC #", "Occurred", "Vehicle", "Driver", "Type", "Severity", "Status",
                "Resolution (h)"), rows);
    }

    private Table costAnalysis(Range range) {
        Map<Long, BigDecimal> fuelCost = fuelIn(range).stream()
                .collect(Collectors.groupingBy(f -> f.getVehicle().getId(),
                        Collectors.reducing(BigDecimal.ZERO, f -> nz(f.getTotalCost()), BigDecimal::add)));
        Map<Long, BigDecimal> maintenanceCost = workOrders().stream()
                .filter(wo -> wo.getStatus() != WorkOrderStatus.CANCELLED && range.contains(workOrderDate(wo)))
                .collect(Collectors.groupingBy(wo -> wo.getVehicle().getId(),
                        Collectors.reducing(BigDecimal.ZERO, this::workOrderCost, BigDecimal::add)));
        Map<Long, Long> kmByVehicle = kmByVehicle(range);

        List<List<Object>> rows = new ArrayList<>();
        BigDecimal totalFuel = BigDecimal.ZERO;
        BigDecimal totalMaintenance = BigDecimal.ZERO;
        long totalKm = 0;
        for (Vehicle v : vehicles()) {
            BigDecimal fuel = fuelCost.getOrDefault(v.getId(), BigDecimal.ZERO);
            BigDecimal maintenance = maintenanceCost.getOrDefault(v.getId(), BigDecimal.ZERO);
            long km = kmByVehicle.getOrDefault(v.getId(), 0L);
            rows.add(row(v.getRegistrationNumber(), vehicleName(v), money(fuel), money(maintenance),
                    money(fuel.add(maintenance)), km, perKm(fuel.add(maintenance), km)));
            totalFuel = totalFuel.add(fuel);
            totalMaintenance = totalMaintenance.add(maintenance);
            totalKm += km;
        }
        BigDecimal total = totalFuel.add(totalMaintenance);
        rows.add(row("TOTAL", "", money(totalFuel), money(totalMaintenance), money(total), totalKm,
                perKm(total, totalKm)));
        return new Table(List.of("Registration", "Vehicle", "Fuel (R)", "Maintenance (R)", "Total (R)", "Km",
                "Cost per km (R)"), rows);
    }

    // ---------------------------------------------------------------- queries

    private List<Vehicle> vehicles() {
        return entityManager.createQuery(
                        "SELECT v FROM Vehicle v WHERE v.deleted = false ORDER BY v.registrationNumber", Vehicle.class)
                .getResultList();
    }

    /** Trips that were on the road at any point in the range. */
    private List<Trip> tripsActiveIn(Range range) {
        return entityManager.createQuery(
                        "SELECT t FROM Trip t WHERE t.deleted = false AND t.startedAt IS NOT NULL " +
                        "AND t.startedAt < :end AND (t.completedAt IS NULL OR t.completedAt >= :start)", Trip.class)
                .setParameter("start", range.start())
                .setParameter("end", range.end())
                .getResultList();
    }

    private List<Trip> tripsCompletedIn(Range range) {
        return entityManager.createQuery(
                        "SELECT t FROM Trip t WHERE t.deleted = false " +
                        "AND t.completedAt >= :start AND t.completedAt < :end", Trip.class)
                .setParameter("start", range.start())
                .setParameter("end", range.end())
                .getResultList();
    }

    private Map<Long, Long> kmByVehicle(Range range) {
        return tripsCompletedIn(range).stream()
                .collect(Collectors.groupingBy(t -> t.getVehicle().getId(), Collectors.summingLong(this::tripKm)));
    }

    private List<FuelEntry> fuelIn(Range range) {
        return entityManager.createQuery(
                        "SELECT f FROM FuelEntry f WHERE f.deleted = false " +
                        "AND f.filledAt >= :start AND f.filledAt < :end", FuelEntry.class)
                .setParameter("start", range.start())
                .setParameter("end", range.end())
                .getResultList();
    }

    private List<WorkOrder> workOrders() {
        return entityManager.createQuery(
                        "SELECT w FROM WorkOrder w JOIN FETCH w.vehicle WHERE w.deleted = false", WorkOrder.class)
                .getResultList();
    }

    private List<Incident> incidentsIn(Range range) {
        return entityManager.createQuery(
                        "SELECT i FROM Incident i JOIN FETCH i.vehicle JOIN FETCH i.driver d JOIN FETCH d.user " +
                        "WHERE i.deleted = false AND COALESCE(i.occurredAt, i.createdAt) >= :start " +
                        "AND COALESCE(i.occurredAt, i.createdAt) < :end", Incident.class)
                .setParameter("start", range.start())
                .setParameter("end", range.end())
                .getResultList();
    }

    // ---------------------------------------------------------------- helpers

    private long tripKm(Trip t) {
        if (t.getDistanceKm() != null) {
            return t.getDistanceKm();
        }
        if (t.getStartMileageKm() != null && t.getEndMileageKm() != null) {
            return Math.max(0, t.getEndMileageKm() - t.getStartMileageKm());
        }
        return 0;
    }

    private BigDecimal workOrderCost(WorkOrder wo) {
        if (wo.getTotalCost() != null) {
            return wo.getTotalCost();
        }
        return nz(wo.getLabourCost()).add(nz(wo.getPartsCost()));
    }

    /** The date a work order "belongs" to for costing and ordering. */
    private LocalDate workOrderDate(WorkOrder wo) {
        if (wo.getCompletedDate() != null) return wo.getCompletedDate();
        if (wo.getStartedDate() != null) return wo.getStartedDate();
        if (wo.getScheduledDate() != null) return wo.getScheduledDate();
        return wo.getCreatedAt() != null ? wo.getCreatedAt().toLocalDate() : LocalDate.now();
    }

    /** Vehicles are off the road from when work starts; open orders not yet started don't count. */
    private LocalDate downtimeStart(WorkOrder wo) {
        if (wo.getStartedDate() != null) {
            return wo.getStartedDate();
        }
        if (wo.getStatus() == WorkOrderStatus.IN_PROGRESS || wo.getStatus() == WorkOrderStatus.AWAITING_PARTS
                || wo.getStatus() == WorkOrderStatus.COMPLETED) {
            if (wo.getScheduledDate() != null) return wo.getScheduledDate();
            return wo.getCreatedAt() != null ? wo.getCreatedAt().toLocalDate() : null;
        }
        return null;
    }

    private LocalDateTime incidentDate(Incident i) {
        return i.getOccurredAt() != null ? i.getOccurredAt() : i.getCreatedAt();
    }

    private static void addDays(Set<LocalDate> days, LocalDate start, LocalDate end, Range range) {
        LocalDate d = start.isBefore(range.from()) ? range.from() : start;
        LocalDate last = end.isAfter(range.to()) ? range.to() : end;
        for (; !d.isAfter(last); d = d.plusDays(1)) {
            days.add(d);
        }
    }

    private static double litres(List<FuelEntry> entries) {
        return entries.stream().mapToDouble(f -> f.getLitres() != null ? f.getLitres() : 0.0).sum();
    }

    private static BigDecimal fuelCost(List<FuelEntry> entries) {
        return entries.stream().map(f -> nz(f.getTotalCost())).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal perKm(BigDecimal cost, long km) {
        return km > 0 ? cost.divide(BigDecimal.valueOf(km), 2, RoundingMode.HALF_UP) : null;
    }

    private static String vehicleName(Vehicle v) {
        return v.getMake() + " " + v.getModel();
    }

    private static List<Object> row(Object... cells) {
        return Arrays.asList(cells);
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static BigDecimal money(BigDecimal value) {
        return value != null ? value.setScale(2, RoundingMode.HALF_UP) : null;
    }

    private static double pct(long part, long whole) {
        return whole > 0 ? round(part * 100.0 / whole, 1) : 0.0;
    }

    private static double round(double value, int places) {
        double factor = Math.pow(10, places);
        return Math.round(value * factor) / factor;
    }

    private static String date(LocalDate d) {
        return d != null ? d.format(DATE) : null;
    }

    private static String dateTime(LocalDateTime d) {
        return d != null ? d.format(DATE_TIME) : null;
    }

    static String humanize(Enum<?> value) {
        if (value == null) {
            return null;
        }
        String s = value.name().replace('_', ' ').toLowerCase(Locale.ROOT);
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
