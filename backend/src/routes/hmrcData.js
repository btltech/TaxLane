const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get HMRC data (stub)
router.get('/data', authMiddleware, async (req, res) => {
  // In real, call HMRC API to pull tax data
  res.json({ message: 'HMRC data pull not implemented yet' });
});

module.exports = router;
