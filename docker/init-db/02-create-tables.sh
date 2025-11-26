#!/bin/bash
# This script creates the database tables if they don't exist
# It's executed by PostgreSQL on startup

set -e

PGPASSWORD=$POSTGRES_PASSWORD psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
	-- Enable TimescaleDB extension
	CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

	-- DEVICES TABLE
	CREATE TABLE IF NOT EXISTS devices (
	    device_id VARCHAR PRIMARY KEY,
	    device_name VARCHAR NOT NULL,
	    location VARCHAR,
	    tree_species VARCHAR,
	    installation_date TIMESTAMP WITH TIME ZONE,
	    status VARCHAR DEFAULT 'active',
	    metadata JSONB
	);

	-- SENSOR_DATA TABLE (TimescaleDB Hypertable)
	CREATE TABLE IF NOT EXISTS sensor_data (
	    time TIMESTAMP WITH TIME ZONE NOT NULL,
	    device_id VARCHAR NOT NULL,
	    diameter_mm FLOAT8,
	    growth_rate_mm_per_hour FLOAT8,
	    temperature_c FLOAT8,
	    humidity_percent FLOAT8,
	    soil_moisture_percent FLOAT8,
	    battery_voltage FLOAT8,
	    solar_voltage FLOAT8,
	    wifi_rssi INTEGER,
	    free_memory BIGINT,
	    raw_data BYTEA,
	    CONSTRAINT fk_sensor_device FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
	);

	-- Convert to TimescaleDB hypertable
	SELECT create_hypertable('sensor_data', 'time', if_not_exists => TRUE);

	-- Create indexes
	CREATE INDEX IF NOT EXISTS idx_sensor_data_device_time ON sensor_data (device_id, time DESC);
	CREATE INDEX IF NOT EXISTS idx_sensor_data_time ON sensor_data (time DESC);

	-- SYSTEM_STATUS TABLE
	CREATE TABLE IF NOT EXISTS system_status (
	    time TIMESTAMP WITH TIME ZONE NOT NULL,
	    device_id VARCHAR NOT NULL,
	    status VARCHAR,
	    message VARCHAR,
	    uptime_ms BIGINT,
	    wifi_connected BOOLEAN,
	    mqtt_connected BOOLEAN,
	    raw_data BYTEA,
	    CONSTRAINT fk_status_device FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
	);

	-- Convert to hypertable
	SELECT create_hypertable('system_status', 'time', if_not_exists => TRUE);

	CREATE INDEX IF NOT EXISTS idx_system_status_device_time ON system_status (device_id, time DESC);
	CREATE INDEX IF NOT EXISTS idx_system_status_time ON system_status (time DESC);

	-- ALERTS TABLE
	CREATE TABLE IF NOT EXISTS alerts (
	    id SERIAL PRIMARY KEY,
	    time TIMESTAMP WITH TIME ZONE NOT NULL,
	    device_id VARCHAR NOT NULL,
	    alert_type VARCHAR,
	    severity VARCHAR,
	    message VARCHAR,
	    acknowledged BOOLEAN DEFAULT FALSE,
	    acknowledged_by VARCHAR,
	    acknowledged_at TIMESTAMP WITH TIME ZONE,
	    raw_data BYTEA,
	    CONSTRAINT fk_alert_device FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_alerts_device ON alerts (device_id);
	CREATE INDEX IF NOT EXISTS idx_alerts_time ON alerts (time DESC);
	CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts (acknowledged);

	-- CARBON_METRICS TABLE
	CREATE TABLE IF NOT EXISTS carbon_metrics (
	    time TIMESTAMP WITH TIME ZONE NOT NULL,
	    device_id VARCHAR NOT NULL,
	    diameter_mm FLOAT8,
	    estimated_height_m FLOAT8,
	    above_ground_biomass_kg FLOAT8,
	    carbon_stock_kg FLOAT8,
	    co2_equivalent_kg FLOAT8,
	    carbon_credits_tons FLOAT8,
	    CONSTRAINT fk_carbon_device FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_carbon_metrics_device_time ON carbon_metrics (device_id, time DESC);
	CREATE INDEX IF NOT EXISTS idx_carbon_metrics_time ON carbon_metrics (time DESC);

	-- Insert sample device
	INSERT INTO devices (device_id, device_name, location, tree_species, installation_date, status, metadata)
	VALUES
	    ('ESP32-001', 'Sengon Tree #1', 'Plot A1, Sector North', 'Sengon', NOW(), 'active',
	     '{"calibration_date": "2024-01-15", "sensor_version": "v2.1"}')
	ON CONFLICT (device_id) DO NOTHING;

EOSQL

echo "Database initialization completed!"
