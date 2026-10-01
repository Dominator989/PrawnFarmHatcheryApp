const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'prawn_farm_hatchery',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

async function ensureDatabaseExists() {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
  await connection.end();
}

async function initDatabase() {
  await ensureDatabaseExists();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tank_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tank_name VARCHAR(100) NOT NULL,
      water_changed_at DATETIME NOT NULL,
      last_fed_at DATETIME NOT NULL,
      next_feed_due DATETIME,
      feed_type VARCHAR(255) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_tank_records_tank_name ON tank_records (tank_name)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_tank_records_next_feed_due ON tank_records (next_feed_due)
  `);
}

module.exports = {
  pool,
  initDatabase,
};
