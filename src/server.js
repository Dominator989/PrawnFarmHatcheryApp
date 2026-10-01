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
    waterChangedAt,
    lastFedAt,
    nextFeedDue,
    feedType,
    notes,
  } = req.body;

  const cleanTankName = String(tankName || '').trim();
  const cleanPrawnStage = String(prawnStage || '').trim();
  const cleanFeedType = String(feedType || '').trim();

  if (!cleanTankName || !cleanPrawnStage || !waterChangedAt || !lastFedAt || !cleanFeedType) {
    return res.status(400).json({
      message: 'Tank name, prawn stage, water change time, last fed time, and feed type are required.',
    });
  }

  try {
    const result = await run(
      `
        INSERT INTO tank_records (
          tank_name,
          prawn_stage,
          water_changed_at,
          last_fed_at,
          next_feed_due,
          feed_type,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [cleanTankName, cleanPrawnStage, waterChangedAt, lastFedAt, nextFeedDue || null, cleanFeedType, notes || null]
    );

    const record = await get('SELECT * FROM tank_records WHERE id = ? LIMIT 1', [result.insertId || result.lastID]);

    res.status(201).json({
      message: 'Tank log saved successfully.',
      record,
    });
  } catch (error) {
    console.error('Unable to save tank record:', error);
    res.status(500).json({ message: `Could not save the tank log to ${dbClient === 'mysql' ? 'MySQL' : 'SQLite'}.` });
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
