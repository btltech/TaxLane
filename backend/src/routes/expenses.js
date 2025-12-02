const express = require('express');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { validateTransactionInput } = require('../utils/validation');

const router = express.Router();

// Get all expenses
router.get('/', authMiddleware, (req, res) => {
  db.all('SELECT * FROM expenses WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

// Add expense
router.post('/', authMiddleware, (req, res) => {
  const { amount, description, category, date } = req.body;
  const validationError = validateTransactionInput({ amount, date });
  if (validationError) return res.status(400).json({ error: validationError });
  db.run('INSERT INTO expenses (user_id, amount, description, category, date) VALUES (?, ?, ?, ?, ?)', [req.user.id, amount, description, category, date], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

module.exports = router;
