CREATE DATABASE IF NOT EXISTS prawn_farm_hatchery;

USE prawn_farm_hatchery;

CREATE TABLE IF NOT EXISTS tank_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tank_name VARCHAR(100) NOT NULL,
    prawn_stage VARCHAR(50) NOT NULL DEFAULT 'Unknown',
    food_type_primary VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    food_type_secondary VARCHAR(100),
    water_changed_at DATETIME NOT NULL,
    last_fed_at DATETIME NOT NULL,
    next_feed_due DATETIME,
    feed_type VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tank_records_tank_name ON tank_records (tank_name);
CREATE INDEX IF NOT EXISTS idx_tank_records_water_changed_at ON tank_records (water_changed_at);
CREATE INDEX IF NOT EXISTS idx_tank_records_next_feed_due ON tank_records (next_feed_due);

CREATE TABLE IF NOT EXISTS adult_prawn_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tank_name VARCHAR(100) NOT NULL,
    food_type_primary VARCHAR(100) NOT NULL,
    food_type_secondary VARCHAR(100),
    water_changed_at DATETIME NOT NULL,
    last_fed_at DATETIME NOT NULL,
    next_feed_due DATETIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
