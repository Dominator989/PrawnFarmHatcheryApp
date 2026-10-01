const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();

dotenv.config();

const dbClient = (process.env.DB_CLIENT || 'sqlite').toLowerCase();
const sqlitePath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'prawn_farm_hatchery.sqlite');

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

let pool = null;
let sqliteDb = null;

if (dbClient === 'mysql') {
  pool = mysql.createPool(dbConfig);
} else {
  const sqliteDir = path.dirname(sqlitePath);
  fs.mkdirSync(sqliteDir, { recursive: true });
  sqliteDb = new sqlite3.Database(sqlitePath);
}

async function ensureMysqlDatabaseExists() {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
  await connection.end();
}

async function query(sql, params = []) {
  if (dbClient === 'mysql') {
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

async function get(sql, params = []) {
  if (dbClient === 'mysql') {
    const [rows] = await pool.query(sql, params);
    return rows[0] || null;
  }

  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row || null);
    });
  });
}

async function run(sql, params = []) {
  if (dbClient === 'mysql') {
    const [result] = await pool.execute(sql, params);
    return result;
  }

  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function onComplete(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        insertId: this.lastID,
        lastID: this.lastID,
        changes: this.changes,
      });
    });
  });
}

async function addSqliteColumnIfMissing(columnDefinition) {
  const columns = await query('PRAGMA table_info(tank_records)');
  const columnName = columnDefinition.split(' ')[0];
  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  await run(`ALTER TABLE tank_records ADD COLUMN ${columnDefinition}`);
}

async function initDatabase() {
  if (dbClient === 'mysql') {
    await ensureMysqlDatabaseExists();
    await pool.query(`
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
      )
    `);

    await pool.query(`
      ALTER TABLE tank_records
      ADD COLUMN IF NOT EXISTS food_type_primary VARCHAR(100) NOT NULL DEFAULT 'Unknown'
    `);
    await pool.query(`
      ALTER TABLE tank_records
      ADD COLUMN IF NOT EXISTS food_type_secondary VARCHAR(100)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tank_records_tank_name ON tank_records (tank_name)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tank_records_next_feed_due ON tank_records (next_feed_due)
    `);

    return;
  }

  await run(`
    CREATE TABLE IF NOT EXISTS tank_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tank_name TEXT NOT NULL,
      prawn_stage TEXT NOT NULL DEFAULT 'Unknown',
      food_type_primary TEXT NOT NULL DEFAULT 'Unknown',
      food_type_secondary TEXT,
      water_changed_at TEXT NOT NULL,
      last_fed_at TEXT NOT NULL,
      next_feed_due TEXT,
      feed_type TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await addSqliteColumnIfMissing('prawn_stage TEXT NOT NULL DEFAULT \'Unknown\'');
  await addSqliteColumnIfMissing('food_type_primary TEXT NOT NULL DEFAULT \'Unknown\'');
  await addSqliteColumnIfMissing('food_type_secondary TEXT');
  await run(`CREATE INDEX IF NOT EXISTS idx_tank_records_tank_name ON tank_records (tank_name)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_tank_records_next_feed_due ON tank_records (next_feed_due)`);
}

module.exports = {
  dbClient,
  pool,
  sqliteDb,
  query,
  get,
  run,
  initDatabase,
};
