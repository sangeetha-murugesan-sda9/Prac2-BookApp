const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

// checks the Authorization: Bearer <token> header. only put this on
// routes that actually change data (create/delete) - search and list
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'missing token' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'invalid or expired token' });
  }
}

module.exports = requireAuth;
