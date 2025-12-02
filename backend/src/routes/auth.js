const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../config/database');
const rateLimit = require('../middleware/rateLimit');
const { isValidEmail } = require('../utils/validation');

const router = express.Router();

// Ensure refresh_tokens table exists - handled in schema

const REFRESH_TTL_MS = parseInt(process.env.REFRESH_TOKEN_TTL_MS, 10) || (30 * 24 * 60 * 60 * 1000);

const createAccessToken = (userId) => {
  // short-lived access token
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_secret_change_me', { expiresIn: '15m' });
};

const generateRefreshToken = () => crypto.randomBytes(48).toString('hex');

const insertRefreshToken = async (userId) => {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS).toISOString();
  await db.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [userId, refreshToken, expiresAt]);
  return { refreshToken, expiresAt };
};

const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/i.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
};

// Register
router.post('/register', rateLimit({ windowMs: 5 * 60 * 1000, max: 20 }), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email address.' });
  const pwdError = validatePassword(password);
  if (pwdError) return res.status(400).json({ error: pwdError });
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id', [email, hashedPassword]);
    const userId = result.rows[0].id;
    const data = await insertRefreshToken(userId);
    res.json({ accessToken: createAccessToken(userId), refreshToken: data.refreshToken });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post('/login', rateLimit({ windowMs: 5 * 60 * 1000, max: 40 }), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email address.' });
  
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const data = await insertRefreshToken(user.id);
    res.json({ accessToken: createAccessToken(user.id), refreshToken: data.refreshToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Missing refresh token' });
  
  try {
    const result = await db.query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]);
    const row = result.rows[0];
    
    if (!row) return res.status(401).json({ error: 'Invalid refresh token' });
    
    if (new Date(row.expires_at) < new Date()) {
      // expired
      await db.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    
    const newToken = generateRefreshToken();
    const newExpires = new Date(Date.now() + REFRESH_TTL_MS).toISOString();
    await db.query('UPDATE refresh_tokens SET token = $1, expires_at = $2 WHERE id = $3', [newToken, newExpires, row.id]);
    
    const accessToken = createAccessToken(row.user_id);
    res.json({ accessToken, refreshToken: newToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout (revoke refresh token)
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Missing refresh token' });
  
  try {
    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
