-- FleetOps Initial Database Schema
-- V1: Core tables for all modules

-- =============================================
-- USERS
-- =============================================
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    account_locked BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    last_login_at TIMESTAMP,
    locked_until TIMESTAMP,
    verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_token_expiry TIMESTAMP,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

CREATE INDEX idx_users_username ON users(username) WHERE deleted = FALSE;
CREATE INDEX idx_users_email ON users(email) WHERE deleted = FALSE;
CREATE INDEX idx_users_role ON users(role) WHERE deleted = FALSE;

-- =============================================
-- DRIVERS
-- =============================================
CREATE TABLE drivers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    employee_number VARCHAR(20) NOT NULL UNIQUE,
    license_number VARCHAR(30) NOT NULL,
    license_class VARCHAR(10),
    license_expiry_date DATE NOT NULL,
    medical_certificate_expiry DATE,
    contact_number VARCHAR(20),
    emergency_contact_name VARCHAR(100),
    emergency_contact_number VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    assigned_vehicle_id BIGINT,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

CREATE INDEX idx_drivers_user ON drivers(user_id) WHERE deleted = FALSE;
CREATE INDEX idx_drivers_status ON drivers(status) WHERE deleted = FALSE;
CREATE INDEX idx_drivers_license_expiry ON drivers(license_expiry_date) WHERE deleted = FALSE;

-- =============================================
-- VEHICLES
-- =============================================
CREATE TABLE vehicles (
    id BIGSERIAL PRIMARY KEY,
    registration_number VARCHAR(20) NOT NULL UNIQUE,
    vin VARCHAR(17) UNIQUE,
    engine_number VARCHAR(30),
    chassis_number VARCHAR(30),
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    variant VARCHAR(50),
    year INT NOT NULL,
    color VARCHAR(30),
    fuel_type VARCHAR(30),
    seating_capacity INT DEFAULT 0,
    engine_capacity_cc INT DEFAULT 0,
    purchase_date DATE,
    purchase_cost DECIMAL(12,2),
    insurance_provider VARCHAR(50),
    insurance_policy_number VARCHAR(50),
    insurance_expiry_date DATE,
    license_expiry_date DATE,
    current_odometer_km BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    assigned_driver_id BIGINT REFERENCES drivers(id),
    next_service_date DATE,
    next_service_mileage_km BIGINT,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

CREATE INDEX idx_vehicles_status ON vehicles(status) WHERE deleted = FALSE;
CREATE INDEX idx_vehicles_registration ON vehicles(registration_number) WHERE deleted = FALSE;
CREATE INDEX idx_vehicles_license_expiry ON vehicles(license_expiry_date) WHERE deleted = FALSE;
CREATE INDEX idx_vehicles_insurance_expiry ON vehicles(insurance_expiry_date) WHERE deleted = FALSE;
CREATE INDEX idx_vehicles_next_service ON vehicles(next_service_date) WHERE deleted = FALSE;

-- Add FK from drivers to vehicles
ALTER TABLE drivers ADD CONSTRAINT fk_drivers_vehicle
    FOREIGN KEY (assigned_vehicle_id) REFERENCES vehicles(id);

-- =============================================
-- TRIPS
-- =============================================
CREATE TABLE trips (
    id BIGSERIAL PRIMARY KEY,
    trip_number VARCHAR(20) NOT NULL UNIQUE,
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
    driver_id BIGINT NOT NULL REFERENCES drivers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    purpose VARCHAR(500),
    route TEXT,
    passengers INT,
    cargo VARCHAR(255),
    requested_at TIMESTAMP,
    approved_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    closed_at TIMESTAMP,
    start_mileage_km BIGINT,
    end_mileage_km BIGINT,
    distance_km BIGINT,
    approved_by_id BIGINT REFERENCES users(id),
    rejection_reason VARCHAR(500),
    review_notes TEXT,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

CREATE INDEX idx_trips_status ON trips(status) WHERE deleted = FALSE;
CREATE INDEX idx_trips_vehicle ON trips(vehicle_id) WHERE deleted = FALSE;
CREATE INDEX idx_trips_driver ON trips(driver_id) WHERE deleted = FALSE;
CREATE INDEX idx_trips_driver_status ON trips(driver_id, status) WHERE deleted = FALSE;

-- =============================================
-- FUEL ENTRIES
-- =============================================
CREATE TABLE fuel_entries (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
    trip_id BIGINT REFERENCES trips(id),
    driver_id BIGINT NOT NULL REFERENCES drivers(id),
    filled_at TIMESTAMP NOT NULL,
    fuel_type VARCHAR(30) NOT NULL,
    litres DOUBLE PRECISION NOT NULL,
    cost_per_litre DECIMAL(8,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    odometer_reading_km BIGINT NOT NULL,
    station VARCHAR(100),
    receipt_url VARCHAR(500),
    notes TEXT,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

CREATE INDEX idx_fuel_vehicle ON fuel_entries(vehicle_id) WHERE deleted = FALSE;
CREATE INDEX idx_fuel_driver ON fuel_entries(driver_id) WHERE deleted = FALSE;
CREATE INDEX idx_fuel_filled_at ON fuel_entries(filled_at) WHERE deleted = FALSE;

-- =============================================
-- WORK ORDERS (Maintenance)
-- =============================================
CREATE TABLE work_orders (
    id BIGSERIAL PRIMARY KEY,
    work_order_number VARCHAR(20) NOT NULL UNIQUE,
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    description TEXT NOT NULL,
    service_type VARCHAR(50),
    workshop VARCHAR(100),
    mechanic_name VARCHAR(100),
    scheduled_date DATE,
    started_date DATE,
    completed_date DATE,
    labour_cost DECIMAL(10,2),
    parts_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    invoice_number VARCHAR(50),
    invoice_url VARCHAR(500),
    parts_used TEXT,
    notes TEXT,
    next_service_date DATE,
    next_service_mileage_km BIGINT,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

CREATE INDEX idx_work_orders_vehicle ON work_orders(vehicle_id) WHERE deleted = FALSE;
CREATE INDEX idx_work_orders_status ON work_orders(status) WHERE deleted = FALSE;
CREATE INDEX idx_work_orders_scheduled ON work_orders(scheduled_date) WHERE deleted = FALSE;

-- =============================================
-- INCIDENTS
-- =============================================
CREATE TABLE incidents (
    id BIGSERIAL PRIMARY KEY,
    incident_number VARCHAR(20) NOT NULL UNIQUE,
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
    driver_id BIGINT NOT NULL REFERENCES drivers(id),
    trip_id BIGINT REFERENCES trips(id),
    type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'REPORTED',
    severity VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255),
    occurred_at TIMESTAMP,
    image_urls TEXT,
    review_notes TEXT,
    resolution_notes TEXT,
    reviewed_by_id BIGINT REFERENCES users(id),
    work_order_id BIGINT REFERENCES work_orders(id),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

CREATE INDEX idx_incidents_vehicle ON incidents(vehicle_id) WHERE deleted = FALSE;
CREATE INDEX idx_incidents_driver ON incidents(driver_id) WHERE deleted = FALSE;
CREATE INDEX idx_incidents_status ON incidents(status) WHERE deleted = FALSE;

-- =============================================
-- GPS POSITIONS
-- =============================================
CREATE TABLE gps_positions (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
    trip_id BIGINT REFERENCES trips(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    recorded_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_gps_vehicle ON gps_positions(vehicle_id);
CREATE INDEX idx_gps_trip ON gps_positions(trip_id);
CREATE INDEX idx_gps_recorded_at ON gps_positions(recorded_at);

-- =============================================
-- AUDIT LOGS
-- =============================================
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    performed_by_user_id BIGINT NOT NULL,
    performed_by_username VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(500),
    performed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(performed_by_user_id);
CREATE INDEX idx_audit_performed_at ON audit_logs(performed_at);

-- =============================================
-- NOTIFICATION LOGS
-- =============================================
CREATE TABLE notification_logs (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(30) NOT NULL,
    recipient_user_id BIGINT REFERENCES users(id),
    recipient_email VARCHAR(255),
    subject VARCHAR(255),
    message TEXT,
    entity_type VARCHAR(50),
    entity_id BIGINT,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'SENT'
);

CREATE INDEX idx_notifications_user ON notification_logs(recipient_user_id);
CREATE INDEX idx_notifications_type ON notification_logs(type);

-- =============================================
-- SAVED SEARCHES
-- =============================================
CREATE TABLE saved_searches (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    module VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    criteria TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id, module);

-- =============================================
-- VIOLATIONS (Driver violations)
-- =============================================
CREATE TABLE violations (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT NOT NULL REFERENCES drivers(id),
    violation_type VARCHAR(50) NOT NULL,
    description TEXT,
    occurred_at TIMESTAMP NOT NULL,
    fine_amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50)
);

CREATE INDEX idx_violations_driver ON violations(driver_id);
