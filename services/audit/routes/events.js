const express = require('express');
const db = require('../db');

const router = express.Router();

// the api calls this every time a note is created or deleted.
// no auth on this route- it's only reachable on the internal
// docker network, not published to the host.
// limitation 
router.post('/events', (req, res) => {
  const { action, note_id, note_title, actor } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'action is required' });
  }

  const stmt = db.prepare(
    'INSERT INTO events (action, note_id, note_title, actor) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(action, note_id || null, note_title || null, actor || 'unknown');

  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/events', (req, res) => {
  const rows = db.prepare('SELECT * FROM events ORDER BY id DESC LIMIT 100').all();
  res.json(rows);
});

module.exports = router;
