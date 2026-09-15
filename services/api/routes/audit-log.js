const express = require('express');
const router = express.Router();

const AUDIT_URL = process.env.AUDIT_SERVICE_URL || 'http://localhost:5000';

// the frontend never talks to the audit service directly - it's not
// exposed publicly, only the api container can reach it on the internal
// docker network. 
router.get('/', async (req, res) => {
  try {
    const auditRes = await fetch(`${AUDIT_URL}/events`);
    if (!auditRes.ok) throw new Error('audit service returned ' + auditRes.status);
    const events = await auditRes.json();
    res.json(events);
  } catch (err) {
    res.status(502).json({ error: 'audit log unavailable', detail: err.message });
  }
});

module.exports = router;
