const express = require('express');
const router = express.Router();
const { supabase } = require('../db');

// GET /api/rooms - list all rooms. public, no auth needed to browse.
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('rooms').select('*').order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
