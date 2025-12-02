const express = require('express');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Audit log all actions
const logAction = (userId, action, details) => {
  db.run('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)', [userId, action, JSON.stringify(details)], () => {});
};

// Middleware to log API calls
router.use(authMiddleware, (req, res, next) => {
  logAction(req.user.id, `${req.method} ${req.path}`, req.body);
  next();
});

// Get audit logs
router.get('/', authMiddleware, (req, res) => {
  db.all('SELECT * FROM audit_logs WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;