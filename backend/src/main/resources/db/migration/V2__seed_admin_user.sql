-- Seed default System Administrator
-- Password: Admin@123 (BCrypt encoded)
INSERT INTO users (username, password_hash, email, full_name, role, enabled, email_verified, account_locked, failed_login_attempts, deleted, created_at, updated_at, created_by, updated_by)
VALUES (
    'admin',
    '$2a$12$LQv3c1yqBo9SkvXS7QIJne.YzHFfILqh2SkxPq1YH4S3VQBNjX/2y',
    'admin@fleetops.co.za',
    'System Administrator',
    'SYSTEM_ADMIN',
    TRUE,
    TRUE,
    FALSE,
    0,
    FALSE,
    NOW(),
    NOW(),
    'system',
    'system'
);
