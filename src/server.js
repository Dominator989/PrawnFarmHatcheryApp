const express = require('express');
const path = require('path');
const { initDatabase, query, run, get, dbClient } = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/tanks', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM tank_records ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Unable to fetch tank records:', error);
    res.status(500).json({ message: 'Unable to load tank records.' });
  }
});

app.post('/api/tanks', async (req, res) => {
  const {
    tankName,
    prawnStage,
    stockedAt,
    foodTypePrimary,
    foodTypeSecondary,
    waterChangedAt,
    lastFedAt,
    nextFeedDue,
    feedType,
    notes,
  } = req.body;

  const cleanTankName = String(tankName || '').trim();
  const cleanPrawnStage = String(prawnStage || '').trim();
  const cleanStockedAt = String(stockedAt || '').trim();
  const cleanFoodTypePrimary = String(foodTypePrimary || feedType || '').trim();
  const cleanFoodTypeSecondary = String(foodTypeSecondary || '').trim();

  if (!cleanTankName || !cleanStockedAt || !waterChangedAt || !lastFedAt || !cleanFoodTypePrimary) {
    return res.status(400).json({
      message: 'Tank name, stocked date, water change time, last fed time, and primary food are required.',
    });
  }

  try {
    const existingRecord = await get('SELECT id FROM tank_records WHERE tank_name = ? ORDER BY id ASC LIMIT 1', [cleanTankName]);
    let record;
    let message;

    if (existingRecord) {
      await run(
        `
          UPDATE tank_records
            SET stocked_at = ?, food_type_primary = ?, food_type_secondary = ?,
              water_changed_at = ?, last_fed_at = ?, next_feed_due = ?,
              feed_type = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [cleanStockedAt, cleanFoodTypePrimary, cleanFoodTypeSecondary || null, waterChangedAt, lastFedAt, nextFeedDue || null, cleanFoodTypePrimary, notes || null, existingRecord.id]
      );
      record = await get('SELECT * FROM tank_records WHERE id = ? LIMIT 1', [existingRecord.id]);
      message = `Tank ${cleanTankName} updated successfully.`;
    } else {
      const result = await run(
        `
          INSERT INTO tank_records (
            tank_name, stocked_at, prawn_stage, food_type_primary, food_type_secondary,
            water_changed_at, last_fed_at, next_feed_due, feed_type, notes
          ) VALUES (?, ?, 'Automatic', ?, ?, ?, ?, ?, ?, ?)
        `,
        [cleanTankName, cleanStockedAt, cleanFoodTypePrimary, cleanFoodTypeSecondary || null, waterChangedAt, lastFedAt, nextFeedDue || null, cleanFoodTypePrimary, notes || null]
      );
      record = await get('SELECT * FROM tank_records WHERE id = ? LIMIT 1', [result.insertId || result.lastID]);
      message = `Tank ${cleanTankName} created successfully.`;
    }

    res.status(201).json({
      message,
      record,
    });
  } catch (error) {
    console.error('Unable to save tank record:', error);
    res.status(500).json({ message: `Could not save the tank log to ${dbClient === 'mysql' ? 'MySQL' : 'SQLite'}.` });
  }
});

app.get('/api/adult-prawns', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM adult_prawn_records ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Unable to fetch adult prawn records:', error);
    res.status(500).json({ message: 'Unable to load adult prawn records.' });
  }
});

app.post('/api/adult-prawns', async (req, res) => {
  const {
    tankName,
    foodTypePrimary,
    foodTypeSecondary,
    waterChangedAt,
    lastFedAt,
    nextFeedDue,
    notes,
  } = req.body;

  const cleanTankName = String(tankName || '').trim();
  const cleanFoodTypePrimary = String(foodTypePrimary || '').trim();
  const cleanFoodTypeSecondary = String(foodTypeSecondary || '').trim();

  if (!cleanTankName || !cleanFoodTypePrimary || !waterChangedAt || !lastFedAt) {
    return res.status(400).json({
      message: 'Tank name, primary food, water change time, and last fed time are required.',
    });
  }

  try {
    const existingRecord = await get('SELECT id FROM adult_prawn_records WHERE tank_name = ? ORDER BY id ASC LIMIT 1', [cleanTankName]);
    let record;
    let message;

    if (existingRecord) {
      await run(
        `
          UPDATE adult_prawn_records
          SET food_type_primary = ?, food_type_secondary = ?, water_changed_at = ?,
              last_fed_at = ?, next_feed_due = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [cleanFoodTypePrimary, cleanFoodTypeSecondary || null, waterChangedAt, lastFedAt, nextFeedDue || null, notes || null, existingRecord.id]
      );
      record = await get('SELECT * FROM adult_prawn_records WHERE id = ? LIMIT 1', [existingRecord.id]);
      message = `Tank ${cleanTankName} updated successfully.`;
    } else {
      const result = await run(
        `
          INSERT INTO adult_prawn_records (
            tank_name, food_type_primary, food_type_secondary,
            water_changed_at, last_fed_at, next_feed_due, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [cleanTankName, cleanFoodTypePrimary, cleanFoodTypeSecondary || null, waterChangedAt, lastFedAt, nextFeedDue || null, notes || null]
      );
      record = await get('SELECT * FROM adult_prawn_records WHERE id = ? LIMIT 1', [result.insertId || result.lastID]);
      message = `Tank ${cleanTankName} created successfully.`;
    }

    res.status(201).json({ message, record });
  } catch (error) {
    console.error('Unable to save adult prawn record:', error);
    res.status(500).json({ message: `Could not save the adult prawn log to ${dbClient === 'mysql' ? 'MySQL' : 'SQLite'}.` });
  }
});

app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true, message: `Database connected successfully using ${dbClient}.` });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: `Database is not available yet. Check your ${dbClient} configuration settings.`,
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Prawn tank tracker running at http://localhost:${PORT} using ${dbClient.toUpperCase()}`);
    });
  } catch (error) {
    console.error('Unable to start the app because the database is not configured:', error.message);
    process.exit(1);
  }
}

startServer();
