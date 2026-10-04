# Tasks: FleetOps Enterprise Fleet Management System

## Task 1: Project Scaffolding & Infrastructure Setup

- [x] Create Spring Boot 3 backend project with Java 21 (Maven)
- [x] Configure project dependencies (Spring Web, Security, Data JPA, Validation, Mail, Flyway, MapStruct, Lombok, jjwt, Bucket4j, Springdoc OpenAPI, Redis)
- [x] Create Angular 17 frontend project with Angular Material, Chart.js, Leaflet, RxJS
- [x] Set up Docker Compose with PostgreSQL 16, Redis 7, Nginx
- [x] Create Dockerfile for backend and frontend
- [x] Set up Flyway migrations baseline
- [x] Configure application.yml for dev/prod profiles
- [x] Create base package structure (controller, service, repository, entity, dto, mapper, config, exception, security, util)

## Task 2: Cross-Cutting Concerns & Base Classes

- [x] Create BaseAuditEntity with createdAt, updatedAt, createdBy, updatedBy
- [x] Create global exception handler (GlobalExceptionHandler)
- [x] Create custom exceptions (BusinessRuleException, EntityNotFoundException, InvalidStateTransitionException, AccountLockedException)
- [x] Create ApiErrorResponse DTO
- [ ] Create SearchCriteria base interface and generic search/filter/pagination support
- [ ] Create @Auditable annotation and AuditAspect (AOP)
- [x] Create AuditLog entity and repository
- [x] Set up CORS configuration
- [x] Set up API versioning (/api/v1/)

## Task 3: Authentication & Security Module

- [x] Create User entity with Flyway migration
- [x] Create UserRepository
- [x] Create JwtProvider (access + refresh token generation/validation)
- [x] Create JwtAuthenticationFilter
- [x] Create SecurityFilterChain configuration with RBAC
- [x] Create AuthService (login, refresh, logout, forgotPassword, resetPassword, changePassword, verifyEmail, lockAccount)
- [x] Create AuthController with endpoints
- [x] Create LoginRequest, AuthResponse, RefreshTokenRequest DTOs
- [x] Implement account lockout logic (5 failed attempts, 30-min lock)
- [x] Implement password policy validation
- [x] Create UserPrincipal for SecurityContext
- [ ] Create rate limiting filter (Bucket4j)

## Task 4: Vehicle Management Module

- [x] Create Vehicle entity with Flyway migration
- [x] Create VehicleStatus enum and status transition map
- [x] Create VehicleRepository with custom queries
- [x] Create VehicleService with status workflow enforcement
- [x] Create VehicleController (CRUD + status transitions)
- [x] Create VehicleCreateRequest, VehicleUpdateRequest, VehicleResponse DTOs
- [ ] Create VehicleMapper (MapStruct)
- [x] Create VehicleSearchCriteria and search implementation
- [x] Implement soft delete
- [x] Validate VIN (17 chars), registration number uniqueness, year range

## Task 5: Driver Management Module

- [ ] Create Driver entity with Flyway migration
- [ ] Create DriverStatus, LicenseClass enums
- [ ] Create DriverRepository with custom queries
- [ ] Create DriverService (register, update, eligibility check, assign/unassign vehicle, record violation)
- [ ] Create DriverController
- [ ] Create DriverCreateRequest, DriverUpdateRequest, DriverResponse DTOs
- [ ] Create DriverMapper (MapStruct)
- [ ] Create DriverSearchCriteria and search implementation
- [ ] Implement license/medical expiry eligibility checks
- [ ] Create Violation entity and tracking

## Task 6: Trip Management Module

- [x] Create Trip entity with Flyway migration
- [x] Create TripStatus enum
- [x] Create TripRepository with custom queries
- [x] Create TripService (request, approve, reject, allocate, start, end, review, close)
- [x] Create TripController
- [x] Create TripCreateRequest, TripStartRequest, TripEndRequest, TripResponse DTOs
- [ ] Create TripMapper (MapStruct)
- [x] Create TripSearchCriteria and search implementation
- [x] Implement all business rules (vehicle available, driver eligible, mileage validation)
- [x] Generate trip numbers (TRIP-YYYYMMDD-XXXX)

## Task 7: Fuel Management Module

- [ ] Create FuelEntry entity with Flyway migration
- [ ] Create FuelEntryRepository with analytics queries
- [ ] Create FuelService (record, update, analytics, trends)
- [ ] Create FuelController
- [ ] Create FuelEntryRequest, FuelEntryResponse, FuelAnalyticsResponse DTOs
- [ ] Create FuelMapper (MapStruct)
- [ ] Implement odometer validation (monotonically increasing)
- [ ] Implement fuel analytics (avg consumption, cost/km, trends)
- [ ] Implement receipt upload (file storage)

## Task 8: Maintenance Management Module

- [ ] Create WorkOrder entity with Flyway migration
- [ ] Create MaintenanceType, WorkOrderStatus enums
- [ ] Create WorkOrderRepository
- [ ] Create MaintenanceService (create, update, complete work orders, schedule checks)
- [ ] Create MaintenanceController
- [ ] Create WorkOrderCreateRequest, WorkOrderResponse DTOs
- [ ] Create MaintenanceMapper (MapStruct)
- [ ] Implement automatic vehicle status change on work order create/complete
- [ ] Create scheduled job for maintenance reminders (@Scheduled)
- [ ] Implement cost tracking and invoice upload

## Task 9: Incident Management Module

- [ ] Create Incident entity with Flyway migration
- [ ] Create IncidentType, IncidentStatus, IncidentSeverity enums
- [ ] Create IncidentRepository
- [ ] Create IncidentService (report, review, resolve, close)
- [ ] Create IncidentController
- [ ] Create IncidentCreateRequest, IncidentResponse DTOs
- [ ] Create IncidentMapper (MapStruct)
- [ ] Implement incident workflow (Reported → Review → Maintenance → Resolved → Closed)
- [ ] Implement image upload for incidents

## Task 10: GPS Simulation Module

- [ ] Create GPSPosition entity with Flyway migration
- [ ] Create GPSSimulationService (start/stop tracking, simulate movement, playback)
- [ ] Create GPSController
- [ ] Create route simulation algorithms (interpolation between waypoints)
- [ ] Create GPSPositionResponse DTO
- [ ] Implement trip playback (historical positions)
- [ ] Implement vehicle history tracking

## Task 11: Notification Module

- [ ] Create NotificationLog entity with Flyway migration
- [ ] Create NotificationType enum
- [ ] Create NotificationService (send, sendBulk, scheduleReminder)
- [ ] Create email templates (Thymeleaf)
- [ ] Configure Spring Mail
- [ ] Create scheduled jobs for license/insurance/medical expiry reminders
- [ ] Create NotificationController (notification history)

## Task 12: Dashboard & Reports Module

- [ ] Create DashboardService (fleet overview, KPIs, charts data)
- [ ] Create DashboardController
- [ ] Create ReportService (fleet utilization, driver performance, maintenance history, fuel consumption, trip summary, vehicle downtime, incident report, cost analysis)
- [ ] Create ReportController
- [ ] Implement PDF export (JasperReports or iText)
- [ ] Implement Excel export (Apache POI)
- [ ] Implement CSV export

## Task 13: Angular Frontend - Core & Auth

- [x] Set up Angular project structure (core, shared, features modules)
- [ ] Configure Angular Material theming
- [x] Create AuthService with JWT interceptor
- [x] Create login page
- [ ] Create forgot/reset password pages
- [x] Create route guards (AuthGuard, RoleGuard)
- [x] Create navigation shell (sidenav, toolbar, breadcrumbs)
- [ ] Create shared components (data table, search bar, confirmation dialog, loading spinner)

## Task 14: Angular Frontend - Feature Modules

- [ ] Create Vehicle Management pages (list, detail, register, edit)
- [ ] Create Driver Management pages (list, detail, register, edit)
- [ ] Create Trip Management pages (list, detail, request, workflow actions)
- [ ] Create Fuel Management pages (list, record entry, analytics)
- [ ] Create Maintenance Management pages (list, create work order, complete)
- [ ] Create Incident Management pages (list, report, workflow)
- [ ] Create GPS Tracking page with Leaflet map
- [ ] Create Dashboard page with Chart.js widgets
- [ ] Create Reports page with export options
- [ ] Create Admin pages (users, audit logs, settings)

## Task 15: DevOps & Deployment

- [x] Create GitHub Actions CI/CD pipeline (build, test, Docker image)
- [x] Configure Nginx as reverse proxy
- [x] Create environment-specific Docker Compose files (dev, prod)
- [ ] Set up health check endpoints (/actuator/health)
- [ ] Configure Swagger/OpenAPI documentation
- [ ] Create deployment guide documentation
