-- Fix default System Administrator password hash
-- The hash seeded in V2 does not match the documented password (Admin@123),
-- so the admin account could not log in on a fresh database.
-- Password: Admin@123 (BCrypt encoded, cost 12)
-- Only replaces the original broken hash, so a password changed since is left alone.
UPDATE users
SET password_hash = '$2a$12$c2GJfKIUX8v1OyaFqeQqBODCFQkIslfVLXYLHFSkVW6dUvIbeEdQ.',
    updated_at = NOW(),
    updated_by = 'system'
WHERE username = 'admin'
  AND password_hash = '$2a$12$LQv3c1yqBo9SkvXS7QIJne.YzHFfILqh2SkxPq1YH4S3VQBNjX/2y';
