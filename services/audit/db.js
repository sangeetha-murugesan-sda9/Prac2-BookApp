const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'audit.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    note_id INTEGER,
    note_title TEXT,
    actor TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;
