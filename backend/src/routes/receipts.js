const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const MAX_RECEIPT_SIZE = ((parseInt(process.env.RECEIPT_MAX_FILE_SIZE_MB, 10) || 15) * 1024 * 1024);
const allowedReceiptTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'application/pdf',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_RECEIPT_SIZE },
  fileFilter: (req, file, cb) => {
    if (allowedReceiptTypes.has(file.mimetype)) return cb(null, true);
    cb(new Error('Unsupported file type. Please upload an image or PDF.'));
  },
});

const singleReceipt = (req, res, next) => {
  upload.single('receipt')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    next();
  });
};

// Upload receipt
router.post('/', authMiddleware, rateLimit({ windowMs: 60 * 1000, max: 10 }), singleReceipt, (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  const { category } = req.body;
  const fileUrl = path.join('uploads', file.filename);
  db.run('INSERT INTO receipts (user_id, file_url, file_name, category) VALUES (?, ?, ?, ?)', [req.user.id, fileUrl, file.originalname, category], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// Get receipts
router.get('/', authMiddleware, (req, res) => {
  db.all('SELECT * FROM receipts WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
