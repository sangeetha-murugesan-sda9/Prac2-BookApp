const express = require('express');
const router = express.Router();
const _ = require('lodash');
const { supabase, pgPool } = require('../db');
const requireAuth = require('../middleware/auth');
const { recordEvent } = require('../lib/audit');

// GET /api/bookings?room_id=1 - list bookings, optionally for one room.
// public - anyone can see what's booked, same as a real booking calendar.
router.get('/', async (req, res) => {
  let query = supabase.from('bookings').select('*').order('starts_at');
  if (req.query.room_id) query = query.eq('room_id', req.query.room_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/bookings/search?q=smith
// this is the SQL injection. 
router.get('/search', async (req, res) => {
  const q = req.query.q || '';

  if (!pgPool) {
    return res.status(500).json({ error: 'SUPABASE_DB_URL not configured' });
  }

  const sql = "SELECT * FROM bookings WHERE customer_name ILIKE '%" + q + "%'";
  console.log('running raw search:', sql); // left in on purpose for demo, 

  try {
    const result = await pgPool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.log('search error:', err.message); // temporary - remove once diagnosed
    res.status(500).json({ error: 'search failed', detail: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { room_id, customer_name, starts_at, ends_at } = req.body;

  if (!room_id || !customer_name || !starts_at || !ends_at) {
    return res.status(400).json({ error: 'room_id, customer_name, starts_at, ends_at are all required' });
  }
  if (new Date(ends_at) <= new Date(starts_at)) {
    return res.status(400).json({ error: 'ends_at must be after starts_at' });
  }

  // app-level overlap check 
  const { data: existing, error: checkErr } = await supabase
    .from('bookings')
    .select('id')
    .eq('room_id', room_id)
    .lt('starts_at', ends_at)
    .gt('ends_at', starts_at);

  if (checkErr) return res.status(500).json({ error: checkErr.message });
  if (existing.length > 0) {
    return res.status(409).json({ error: 'that room is already booked for part of this time range' });
  }

  const payload = _.pick(req.body, ['room_id', 'customer_name', 'starts_at', 'ends_at']);
  const { data, error } = await supabase.from('bookings').insert(payload).select().single();

  if (error) {
    if (error.code === '23P01') {
      return res.status(409).json({ error: 'that room was just booked by someone else - try a different time' });
    }
    return res.status(500).json({ error: error.message });
  }

  recordEvent('create', { id: data.id, title: `${data.customer_name} - room ${data.room_id}`, actor: req.user.username });
  res.status(201).json(data);
});

// DELETE /api/bookings/:id - cancel a booking. requires login.
router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'bad id' });

  const { data: existing } = await supabase.from('bookings').select('*').eq('id', id).single();
  const { error, count } = await supabase.from('bookings').delete({ count: 'exact' }).eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  if (!count) return res.status(404).json({ error: 'booking not found' });

  if (existing) {
    recordEvent('cancel', { id: existing.id, title: `${existing.customer_name} - room ${existing.room_id}`, actor: req.user.username });
  }
  res.status(204).end();
});

module.exports = router;
