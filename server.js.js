const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'halflife-esp32-key';

const db = new Database('monitor.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    temperature REAL NOT NULL,
    humidity REAL NOT NULL,
    alert_active INTEGER NOT NULL
  )
`);

// Prepare statements once for better performance
const insertTelemetry = db.prepare('INSERT INTO telemetry (temperature, humidity, alert_active) VALUES (?, ?, ?)');
const getCurrent = db.prepare('SELECT * FROM telemetry ORDER BY id DESC LIMIT 1');
const getHistory = db.prepare('SELECT * FROM telemetry ORDER BY id DESC LIMIT 50');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const authMiddleware = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.post('/api/telemetry', authMiddleware, (req, res) => {
  const { temperature, humidity, alert_active } = req.body;

  if (typeof temperature !== 'number' || typeof humidity !== 'number') {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    const info = insertTelemetry.run(temperature, humidity, alert_active ? 1 : 0);
    console.log(`[\({new Date().toISOString()}] Logged - Temp:\){temperature}°C, Hum: \({humidity}%, Alert:\){alert_active}`);
    res.status(201).json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    console.error('Database write error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/current', (req, res) => {
  try {
    const data = getCurrent.get();
    res.json(data || {});
  } catch (err) {
    console.error('Database read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/history', (req, res) => {
  try {
    const data = getHistory.all();
    res.json(data.reverse());
  } catch (err) {
    console.error('Database read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on 0.0.0.0:${PORT}`);
});