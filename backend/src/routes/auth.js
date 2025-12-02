const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../config/database');
const rateLimit = require('../middleware/rateLimit');
const { isValidEmail } = require('../utils/validation');

const router = express.Router();

// Ensure refresh_tokens table exists
db.run(`CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  token TEXT UNIQUE,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
 )`);

const REFRESH_TTL_MS = parseInt(process.env.REFRESH_TOKEN_TTL_MS, 10) || (30 * 24 * 60 * 60 * 1000);

const createAccessToken = (userId) => {
  // short-lived access token
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = () => crypto.randomBytes(48).toString('hex');

const insertRefreshToken = (userId, callback) => {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS).toISOString();
  db.run('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [userId, refreshToken, expiresAt], (err) => {
    if (err) return callback(err);
    callback(null, { refreshToken, expiresAt });
  });
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
router.post('/register', rateLimit({ windowMs: 5 * 60 * 1000, max: 20 }), (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email address.' });
  const pwdError = validatePassword(password);
  if (pwdError) return res.status(400).json({ error: pwdError });
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return res.status(500).json({ error: 'Hash error' });
    db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hashedPassword], function(err) {
      if (err) return res.status(400).json({ error: err.message });
      const userId = this.lastID;
      insertRefreshToken(userId, (err2, data) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ accessToken: createAccessToken(userId), refreshToken: data.refreshToken });
      });
    });
  });
});

// Login
router.post('/login', rateLimit({ windowMs: 5 * 60 * 1000, max: 40 }), (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email address.' });
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    insertRefreshToken(user.id, (err2, data) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ accessToken: createAccessToken(user.id), refreshToken: data.refreshToken });
    });
  });
});

// Refresh access token
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Missing refresh token' });
  db.get('SELECT * FROM refresh_tokens WHERE token = ?', [refreshToken], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Invalid refresh token' });
    if (new Date(row.expires_at) < new Date()) {
      // expired
      db.run('DELETE FROM refresh_tokens WHERE id = ?', [row.id]);
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    const newToken = generateRefreshToken();
    const newExpires = new Date(Date.now() + REFRESH_TTL_MS).toISOString();
    db.run('UPDATE refresh_tokens SET token = ?, expires_at = ? WHERE id = ?', [newToken, newExpires, row.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      const accessToken = createAccessToken(row.user_id);
      res.json({ accessToken, refreshToken: newToken });
    });
  });
});

// Logout (revoke refresh token)
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Missing refresh token' });
  db.run('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Logged out' });
  });
});

module.exports = router;
