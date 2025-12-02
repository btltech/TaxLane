const express = require('express');
const multer = require('multer');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ((parseInt(process.env.CSV_MAX_FILE_SIZE_MB, 10) || 2) * 1024 * 1024) },
});

const toCsv = (rows, columns) => {
  const header = columns.join(',');
  const body = rows
    .map((row) => columns.map((col) => {
      const value = row[col] ?? '';
      const str = `${value}`;
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','))
    .join('\n');
  return `${header}\n${body}`;
};

const splitCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

const parseCsv = (buffer) => {
  const text = buffer.toString('utf8').trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? '').trim();
    });
    return row;
  });
};

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) return reject(err);
    resolve(this);
  });
});

router.get('/income/export', authMiddleware, async (req, res) => {
  db.all('SELECT date, amount, description, category, client_id FROM income WHERE user_id = ? ORDER BY date DESC', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const csv = toCsv(rows, ['date', 'amount', 'description', 'category', 'client_id']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=income.csv');
    return res.send(csv);
  });
});

router.get('/expenses/export', authMiddleware, async (req, res) => {
  db.all('SELECT date, amount, description, category FROM expenses WHERE user_id = ? ORDER BY date DESC', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const csv = toCsv(rows, ['date', 'amount', 'description', 'category']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
    return res.send(csv);
  });
});

const importRecords = async (rows, mapper) => {
  let imported = 0;
  let skipped = 0;
  const errors = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const row of rows) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await mapper(row);
      imported += 1;
    } catch (err) {
      skipped += 1;
      errors.push(err.message);
    }
  }
  return { imported, skipped, errors };
};

router.post('/income/import', authMiddleware, rateLimit({ windowMs: 60 * 1000, max: 5 }), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Upload a CSV file with the "file" field.' });
  const rows = parseCsv(req.file.buffer);
  const result = await importRecords(rows, async (row) => {
    const amount = parseFloat(row.amount ?? row.amt);
    const date = row.date || row['transaction date'];
    if (!date || Number.isNaN(amount)) throw new Error('Missing date or amount.');
    const description = row.description || '';
    const category = row.category || 'Other';
    const clientId = row.client_id ? parseInt(row.client_id, 10) : null;
    await run('INSERT INTO income (user_id, amount, description, category, date, client_id) VALUES (?, ?, ?, ?, ?, ?)', [req.user.id, amount, description, category, date, clientId || null]);
  });
  return res.json(result);
});

router.post('/expenses/import', authMiddleware, rateLimit({ windowMs: 60 * 1000, max: 5 }), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Upload a CSV file with the "file" field.' });
  const rows = parseCsv(req.file.buffer);
  const result = await importRecords(rows, async (row) => {
    const amount = parseFloat(row.amount ?? row.amt);
    const date = row.date || row['transaction date'];
    if (!date || Number.isNaN(amount)) throw new Error('Missing date or amount.');
    const description = row.description || '';
    const category = row.category || 'Other';
    await run('INSERT INTO expenses (user_id, amount, description, category, date) VALUES (?, ?, ?, ?, ?)', [req.user.id, amount, description, category, date]);
  });
  return res.json(result);
});

module.exports = router;
