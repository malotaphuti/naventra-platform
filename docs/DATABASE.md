# Database & Migrations

FleetOps uses **PostgreSQL 16**, versioned with **Flyway**. Hibernate runs with `ddl-auto: validate`: it never changes the schema, and it refuses to start if an entity doesn't match the tables.

Migrations live in `backend/src/main/resources/db/migration/` and run automatically when the backend starts (`dev` profile).

## Migration history

| Version | File | Purpose |
|---------|------|---------|
| V1 | `V1__initial_schema.sql` | Initial schema: users, vehicles, drivers, trips, fuel, maintenance, incidents, etc. |
| V2 | `V2__seed_admin_user.sql` | Seeds the default `admin` System Administrator |
| V3 | `V3__fix_admin_password_hash.sql` | Replaces V2's admin hash, which didn't match the documented password `Admin@123` |

## Rules for writing migrations

1. **Never edit a migration that has already been applied** to a shared or persistent database. Flyway stores a checksum per version and fails validation if a file changes. Add a new `V<n+1>__description.sql` instead (V3 is an example: it corrects V2's data without touching V2).
2. **Naming:** `V<version>__<snake_case_description>.sql`, with two underscores. Versions must increase.
3. **Keep entities and SQL in sync.** Every `@Column(name = ...)` must match a real column. For example, `Vehicle.year` maps to the `year` column created in V1.
4. **Make data fixes conditional** where you can, so they don't overwrite later legitimate changes (V3 only updates the hash if it still equals the broken value).
5. **Test against Postgres.** The `demo` profile uses H2 with `ddl-auto: create` and Flyway disabled, so it builds the schema from entities and **hides entity/migration mismatches**.

## Generating a BCrypt hash for seed users

The backend uses Spring's `BCryptPasswordEncoder` (`$2a$`, cost 12). To generate a hash without starting the app, run this in any scratch directory:

```bash
npm i bcryptjs
node -e "console.log(require('bcryptjs').hashSync('YourPassword', 12))"
```

Check a hash against a password before you commit it:

```bash
node -e "console.log(require('bcryptjs').compareSync('YourPassword', '<hash>'))"
```

## Common tasks

```bash
# psql shell into the Compose database
docker exec -it fleetops-db psql -U fleetops -d fleetops

# See which migrations have been applied
docker exec fleetops-db psql -U fleetops -d fleetops \
  -c "select version, description, success from flyway_schema_history order by installed_rank;"

# Wipe local data and re-run all migrations from scratch
docker compose down -v
docker compose up -d
```

## Known issues fixed

- **`Schema-validation: missing column [model_year] in table [vehicles]`**: `Vehicle.java` mapped the year field to `model_year`, but V1 creates `year`. The entity now maps to `year`.
- **Admin login returned 401 on fresh databases**: the V2 seed hash didn't match `Admin@123`. Fixed by V3.
