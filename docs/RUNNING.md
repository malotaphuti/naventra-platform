# Running FleetOps Locally

FleetOps is a Spring Boot 3 backend (Java 21) and an Angular 17 frontend, backed by PostgreSQL 16 and Redis 7.

## Option 1: Docker Compose (recommended)

The only thing you need installed is Docker Desktop. Maven, the JDK and Node all run inside the build containers.

```bash
docker compose up -d --build
```

The first build downloads Maven and npm dependencies, so it takes several minutes. Both Dockerfiles use BuildKit cache mounts, so later rebuilds only fetch what changed (about 30–60 s). If a build fails with `ECONNRESET` or "Premature end of Content-Length", it's a network blip: run the same command again and it resumes from the cache.

| Service  | Container           | URL / port                                  |
|----------|---------------------|---------------------------------------------|
| Frontend | `fleetops-frontend` | http://localhost:4200 (nginx)               |
| Backend  | `fleetops-backend`  | http://localhost:8080/api                   |
| Postgres | `fleetops-db`       | `localhost:5432`, db/user/password `fleetops` |
| Redis    | `fleetops-redis`    | `localhost:6379`                            |

Inside the Compose network, nginx proxies `/api/` to `http://backend:8080/api/`. The browser only ever talks to port 4200.

Useful commands:

```bash
docker compose ps                     # service status
docker compose logs -f backend        # follow backend logs
docker compose up -d --build backend  # rebuild after backend code changes
docker compose down                   # stop (data is kept)
docker compose down -v                # stop and wipe the Postgres and Redis volumes
```

Wait for `Started FleetOpsApplication` in the backend logs before logging in.

## Option 2: Run the apps natively (for development)

Requires JDK 21, Maven 3.9+ and Node 20+.

```bash
# 1. Start only the infrastructure
docker compose up -d postgres redis

# 2. Backend (dev profile is the default; listens on :8080/api)
cd backend
mvn spring-boot:run

# 3. Frontend dev server with live reload (proxies /api to :8080, see proxy.conf.json)
cd frontend
npm install
npm start
```

Open http://localhost:4200.

## Spring profiles

| Profile | Database | Flyway | Seed data | Use for |
|---------|----------|--------|-----------|---------|
| `dev` (default) | PostgreSQL | Enabled, `ddl-auto: validate` | Admin user only (migration V2/V3) | Normal development, Docker Compose |
| `demo` | H2 in-memory | **Disabled**, `ddl-auto: create` | Users, 8 vehicles, 2 drivers (`DemoDataInitializer`) | Quick demos with no Postgres or Redis |

Run the demo profile with `mvn spring-boot:run -Dspring-boot.run.profiles=demo`.

> The `demo` profile builds its schema from the JPA entities, not from the migrations. Mismatches between entities and SQL migrations therefore **only show up under `dev`**. Always test schema changes against Postgres.

## Login credentials

| Profile | Username | Password | Role |
|---------|----------|----------|------|
| `dev` / Docker | `admin` | `Admin@123` | SYSTEM_ADMIN |
| `demo` | `admin` | `Admin@123` | SYSTEM_ADMIN |
| `demo` | `fleet.manager` | `Manager@123` | FLEET_MANAGER |
| `demo` | `driver1`, `driver2` | `Driver@123` | DRIVER |
| `demo` | `maintenance` | `Maint@123` | MAINTENANCE_OFFICER |
| `demo` | `executive` | `Exec@123` | EXECUTIVE |

Change the admin password before deploying anywhere shared. After 5 failed logins an account locks for 30 minutes (`fleetops.security.*` in `application.yml`).

## Environment variables

The backend reads these (defaults in `application.yml`):

| Variable | Default | Notes |
|----------|---------|-------|
| `SPRING_PROFILES_ACTIVE` | `dev` | |
| `SERVER_PORT` | `8080` | |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | `localhost` / `5432` / `fleetops` | |
| `DB_USERNAME` / `DB_PASSWORD` | `fleetops` / `fleetops` | |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | `localhost` / `6379` / empty | |
| `JWT_SECRET` | dev key | Must be at least 256 bits. **Override in every non-local environment.** |
| `CORS_ORIGINS` | `http://localhost:4200` | |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USERNAME` / `MAIL_PASSWORD` | Gmail SMTP | Needed for password reset and verification emails |
| `UPLOAD_PATH` | `./uploads` | |
| `FLEETOPS_TIMEZONE` | `Africa/Johannesburg` | Business time zone. Times users enter (fuel slips, incidents) are compared with server "now" in this zone. |

## API reference

- Base path: `/api/v1/...` (for example `POST /api/v1/auth/login` with `{"username","password"}`)
- Swagger UI: http://localhost:8080/api/v1/swagger-ui.html
- OpenAPI JSON: http://localhost:8080/api/v1/api-docs
- Health: http://localhost:8080/api/actuator/health

Quick smoke test (PowerShell):

```powershell
$r = Invoke-RestMethod -Method Post http://localhost:4200/api/v1/auth/login `
  -ContentType 'application/json' -Body '{"username":"admin","password":"Admin@123"}'
Invoke-RestMethod http://localhost:4200/api/v1/dashboard/overview `
  -Headers @{ Authorization = "Bearer $($r.accessToken)" }
```

## Troubleshooting

### `ports are not available: ... 0.0.0.0:8080 ... bind`

Another process already holds port 8080. On Windows, a common culprit is the **Oracle Database TNS listener** (`TNSLSNR.exe`). To find the owner:

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | ForEach-Object { Get-Process -Id $_.OwningProcess }
```

Either stop that process (for Oracle, `lsnrctl stop`) or remap the backend's host port without editing `docker-compose.yml`. Create `docker-compose.override.yml`, which Compose picks up automatically and which is ignored by git:

```yaml
services:
  backend:
    ports: !override
      - "8081:8080"
```

The frontend container is unaffected, because nginx reaches the backend on the internal network. For native frontend development, also point `proxy.conf.json` at the new port.

### Backend exits with `Schema-validation: missing column [...]`

A JPA entity's `@Column` doesn't match the Flyway migrations. Fix it with a new migration or by correcting the entity. See [DATABASE.md](DATABASE.md).

### Login returns 401 for `admin` on an older database

Databases created before migration V3 have a broken admin password hash. Restarting the backend on the current code applies V3 automatically. If V3 didn't fix it (because the hash had been changed by hand), reset the database with `docker compose down -v`.

### Backend can't connect to Postgres or Redis when run natively

Check that `docker compose up -d postgres redis` is running and that both show `healthy` in `docker compose ps`.
