-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS transitops;
USE transitops;

-- Drop tables if they exist (for clean initialization)
DROP TABLE IF EXISTS maintenance_logs;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS users;

-- 1. Users table (for authentication & RBAC)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Fleet Manager', 'Driver', 'Safety Officer', 'Financial Analyst') NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Vehicles table
CREATE TABLE vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    model VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    max_load DECIMAL(10, 2) NOT NULL COMMENT 'Maximum load capacity in kg',
    odometer DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Odometer reading in km',
    acquisition_cost DECIMAL(12, 2) NOT NULL,
    status ENUM('Available', 'On Trip', 'In Shop', 'Retired') DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Drivers table
CREATE TABLE drivers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    license_category VARCHAR(50) NOT NULL,
    license_expiry DATE NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    safety_score DECIMAL(5, 2) DEFAULT 100.00,
    status ENUM('Available', 'On Trip', 'Off Duty', 'Suspended') DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Trips table
CREATE TABLE trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    vehicle_id INT,
    driver_id INT,
    cargo_weight DECIMAL(10, 2) NOT NULL,
    planned_distance DECIMAL(10, 2) NOT NULL,
    status ENUM('Draft', 'Dispatched', 'Completed', 'Cancelled') DEFAULT 'Draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Maintenance Logs table
CREATE TABLE maintenance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    status ENUM('Active', 'Closed') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed some default vehicles
INSERT INTO vehicles (registration_number, model, type, max_load, odometer, acquisition_cost, status) VALUES
('VAN-01', 'Ford Transit 2022', 'Van', 1200.00, 15200.50, 35000.00, 'Available'),
('VAN-02', 'Mercedes Sprinter 2021', 'Van', 1500.00, 28400.10, 45000.00, 'On Trip'),
('TRK-01', 'Volvo FH16 2020', 'Heavy Truck', 18000.00, 142000.00, 120000.00, 'In Shop'),
('TRK-02', 'Scania R500 2019', 'Heavy Truck', 15000.00, 185300.20, 105000.00, 'Available'),
('EV-01', 'Tesla Semi 2023', 'Electric Truck', 20000.00, 5600.00, 180000.00, 'Available'),
('VAN-03', 'Chevrolet Express 2015', 'Van', 1000.00, 210000.00, 25000.00, 'Retired');

-- Seed some default drivers
INSERT INTO drivers (name, license_number, license_category, license_expiry, contact_number, safety_score, status) VALUES
('Alex Mercer', 'DL-987654321', 'Class A', '2027-12-31', '+15550199', 95.50, 'Available'),
('Sarah Connor', 'DL-123456789', 'Class A', '2026-09-15', '+15550188', 98.20, 'On Trip'),
('John Doe', 'DL-555666777', 'Class B', '2025-05-10', '+15550177', 88.00, 'Off Duty'),
('Marcus Wright', 'DL-888999000', 'Class A', '2023-01-10', '+15550166', 75.00, 'Suspended');

-- Seed some default trips
INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status) VALUES
('Warehouse A', 'Distribution Center B', 2, 2, 850.00, 120.50, 'Dispatched'),
('Port Terminal 1', 'Main Hub', 3, 1, 15000.00, 45.00, 'Draft');
