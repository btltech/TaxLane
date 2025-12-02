const express = require('express');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Audit log all actions
const logAction = async (userId, action, details) => {
  try {
    await db.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)', [userId, action, JSON.stringify(details)]);
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

// Middleware to log API calls
router.use(authMiddleware, (req, res, next) => {
  logAction(req.user.id, `${req.method} ${req.path}`, req.body);
  next();
});

// Get audit logs
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY timestamp DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;