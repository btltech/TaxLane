const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createJob, getJob } = require('../ocr/queue');
const authMiddleware = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const MAX_FILE_SIZE_BYTES = ((parseInt(process.env.OCR_MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024);
const allowedMimeTypes = new Set([
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
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) return cb(null, true);
    cb(new Error('Unsupported file type. Please upload an image or PDF.'));
  },
});

const singleFile = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    next();
  });
};

// Enqueue OCR job
router.post('/', authMiddleware, rateLimit({ windowMs: 60 * 1000, max: 10 }), singleFile, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = req.file.path;
  const job = createJob(filePath, req.file.originalname, req.user.id);
  res.json({ jobId: job.id, status: job.status });
});

// Get job status/result
router.get('/:id', authMiddleware, (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.userId && job.userId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to view this job' });
  }
  res.json({ id: job.id, status: job.status, result: job.result, error: job.error });
});

module.exports = router;
