-- Accounts created or reset by an administrator get a one-time temporary password.
-- The user must choose their own password at first sign-in, and the temporary one expires.
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN temp_password_expires_at TIMESTAMP;
