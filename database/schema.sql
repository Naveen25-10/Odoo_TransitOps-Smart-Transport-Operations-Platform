-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS transitops;
USE transitops;

-- Drop tables if they exist (for clean initialization)
DROP TABLE IF EXISTS financial_ledger;
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
    status ENUM('Scheduled', 'In Progress', 'Completed', 'Overdue') DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Financial Ledger table
CREATE TABLE financial_ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('Revenue', 'Expense') NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    reference_id VARCHAR(50) NULL COMMENT 'Associated trip ID or maintenance ID',
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed some default vehicles
INSERT INTO vehicles (registration_number, model, type, max_load, odometer, acquisition_cost, status) VALUES
('TR-204-X', 'Mercedes-Benz Actros', 'Heavy Truck', 26000.00, 142308.00, 135000.00, 'Available'),
('EV-988-L', 'Rivian EDV 700', 'Van', 4500.00, 12442.00, 85000.00, 'On Trip'),
('HT-055-M', 'Scania R500', 'Heavy Truck', 32000.00, 456120.00, 115000.00, 'In Shop'),
('OL-112-D', 'Ford Transit (2012)', 'Van', 1200.00, 892445.00, 18000.00, 'Retired'),
('VAN-05-TX', 'Chevrolet Express', 'Van', 1500.00, 95200.00, 32000.00, 'In Shop'),
('HT-112-L', 'Volvo FH16', 'Heavy Truck', 28000.00, 112400.00, 125000.00, 'Available'),
('SPR-901', 'Mercedes Sprinter', 'Van', 2000.00, 156800.00, 48000.00, 'In Shop'),
('VAN-14-TX', 'Ram ProMaster', 'Van', 1800.00, 64200.00, 39000.00, 'Available');

-- Seed some default drivers
INSERT INTO drivers (name, license_number, license_category, license_expiry, contact_number, safety_score, status) VALUES
('Marcus Sterling', 'DL-8921X', 'CAT C', '2026-12-15', '+15550211', 4.90, 'Available'),
('Sarah Jenkins', 'DL-4412B', 'CAT C+E', '2025-05-20', '+15550212', 4.70, 'On Trip'),
('Robert Vance', 'DL-0051K', 'CAT B', '2027-02-28', '+15550213', 4.80, 'Off Duty'),
('Liam O''Connor', 'DL-3398M', 'CAT C', '2023-10-10', '+15550214', 3.20, 'Suspended');

-- Seed some default trips
INSERT INTO trips (id, source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status) VALUES
(9021, 'Chicago (CHI)', 'Detroit (DET)', 1, 1, 12450.00, 280.00, 'Dispatched'),
(9018, 'Columbus (CMH)', 'Gary (GYY)', 2, 2, 8120.00, 310.00, 'Completed'),
(9025, 'Indianapolis (IND)', 'St. Louis (STL)', NULL, NULL, 15000.00, 240.00, 'Draft'),
(8999, 'Milwaukee (MKE)', 'Madison (MSN)', 4, 3, 4500.00, 80.00, 'Cancelled');

-- Seed some maintenance logs
INSERT INTO maintenance_logs (vehicle_id, description, cost, start_date, end_date, status) VALUES
(5, 'Full Engine Diagnostic', 1240.00, '2023-10-24', NULL, 'In Progress'),
(6, 'Tire Rotation & Balance', 350.00, '2023-10-26', '2023-10-27', 'Completed'),
(7, 'Transmission Flush', 890.00, '2023-10-20', NULL, 'Overdue'),
(8, 'Brake Pad Replacement', 550.00, '2023-10-28', NULL, 'Scheduled');

-- Seed some financial ledger entries
INSERT INTO financial_ledger (type, category, amount, description, reference_id, date) VALUES
('Revenue', 'Trip Revenue', 2450.00, 'Completed trip from Columbus to Gary', 'TRP-9018', '2023-10-26'),
('Expense', 'Maintenance Cost', 1240.00, 'Full Engine Diagnostic check', 'VAN-05-TX', '2023-10-24'),
('Expense', 'Driver Payout', 850.00, 'Payout to Sarah Jenkins for TRP-9018', 'Sarah Jenkins', '2023-10-23'),
('Expense', 'Fuel Expense', 420.00, 'Refueling for Heavy Truck TR-204-X', 'TR-204-X', '2023-10-22'),
('Expense', 'Asset Purchase', 180000.00, 'Purchased Tesla Semi EV-01', 'EV-01', '2023-10-15');
