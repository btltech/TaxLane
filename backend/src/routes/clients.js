const express = require('express');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all clients
router.get('/', authMiddleware, (req, res) => {
  db.all('SELECT * FROM clients WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

// Add client
router.post('/', authMiddleware, (req, res) => {
  const { name, email } = req.body;
  db.run('INSERT INTO clients (user_id, name, email) VALUES (?, ?, ?)', [req.user.id, name, email], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

module.exports = router;