const express = require('express');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { validateTransactionInput } = require('../utils/validation');

const router = express.Router();

// Get all income
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM income WHERE user_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add income
router.post('/', authMiddleware, async (req, res) => {
  const { amount, description, category, date } = req.body;
  const validationError = validateTransactionInput({ amount, date });
  if (validationError) return res.status(400).json({ error: validationError });
  
  try {
    const result = await db.query('INSERT INTO income (user_id, amount, description, category, date) VALUES ($1, $2, $3, $4, $5) RETURNING id', [req.user.id, amount, description, category, date]);
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
