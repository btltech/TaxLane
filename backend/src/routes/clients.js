const express = require('express');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all clients
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clients WHERE user_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add client
router.post('/', authMiddleware, async (req, res) => {
  const { name, email } = req.body;
  try {
    const result = await db.query('INSERT INTO clients (user_id, name, email) VALUES ($1, $2, $3) RETURNING id', [req.user.id, name, email]);
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;