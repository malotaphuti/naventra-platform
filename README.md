# naventra-platform

**FleetOps**: fleet management for vehicles, drivers, trips, fuel, maintenance and incidents, with role-based access.

- **Backend:** Spring Boot 3, Java 21, PostgreSQL 16 (Flyway), Redis 7, JWT auth: `backend/`
- **Frontend:** Angular 17 + Angular Material: `frontend/`

## Quick start

```bash
docker compose up -d --build
```

- App: http://localhost:4200, logging in as `admin` / `Admin@123`
- API: http://localhost:8080/api (Swagger: `/api/v1/swagger-ui.html`)

## Documentation

- [docs/RUNNING.md](docs/RUNNING.md): running with Docker or natively, profiles, credentials, environment variables, troubleshooting
- [docs/DATABASE.md](docs/DATABASE.md): schema migrations, migration rules, seed users
- [.kiro/specs/fleet-ops/design.md](.kiro/specs/fleet-ops/design.md): system design
- [.kiro/specs/fleet-ops/tasks.md](.kiro/specs/fleet-ops/tasks.md): implementation task list
