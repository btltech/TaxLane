const express = require('express');
const PDFDocument = require('pdfkit');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const getAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  });
});

const getOne = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
  });
});

const formatCurrency = (value) => `£${Number.parseFloat(value || 0).toFixed(2)}`;
const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Generate PDF report
router.get('/report', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [income, expenses] = await Promise.all([
      getAll('SELECT * FROM income WHERE user_id = ? ORDER BY date DESC', [userId]),
      getAll('SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC', [userId]),
    ]);
    const calc = await getOne('SELECT * FROM calculations WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
    const topClients = await getAll(
      `SELECT c.name as clientName, SUM(i.amount) as totalIncome
       FROM income i
       LEFT JOIN clients c ON c.id = i.client_id
       WHERE i.user_id = ?
       GROUP BY i.client_id
       ORDER BY totalIncome DESC
       LIMIT 5`,
      [userId]
    );
    const categories = await getAll(
      `SELECT category, SUM(amount) as total
       FROM expenses
       WHERE user_id = ?
       GROUP BY category
       ORDER BY total DESC`,
      [userId]
    );

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=taxlane-report.pdf');
    doc.pipe(res);

    doc.fontSize(22).text('TaxLane Financial Summary', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text('Headline Metrics', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Total Income: ${formatCurrency(calc?.total_income)}`);
    doc.text(`Total Expenses: ${formatCurrency(calc?.total_expenses)}`);
    doc.text(`Profit: ${formatCurrency(calc?.profit)}`);
    doc.text(`VAT Estimate: ${formatCurrency(calc?.vat)}`);
    doc.text(`Tax Estimate: ${formatCurrency(calc?.tax_estimate)}`);
    doc.text(`NI Estimate: ${formatCurrency(calc?.ni_estimate)}`);
    doc.moveDown();

    if (topClients.length) {
      doc.fontSize(14).text('Top Clients', { underline: true });
      doc.moveDown(0.5);
      topClients.forEach((client, index) => {
        doc.text(`${index + 1}. ${client.clientName || 'Unnamed'} – ${formatCurrency(client.totalIncome)}`);
      });
      doc.moveDown();
    }

    if (categories.length) {
      doc.fontSize(14).text('Expenses by Category', { underline: true });
      doc.moveDown(0.5);
      categories.forEach((category) => {
        doc.text(`${category.category || 'Uncategorized'} – ${formatCurrency(category.total)}`);
      });
      doc.moveDown();
    }

    const addTable = (title, rows, columns) => {
      if (!rows.length) return;
      doc.fontSize(14).text(title, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      columns.forEach((col, idx) => {
        doc.text(col.header, { continued: idx !== columns.length - 1 });
      });
      doc.moveDown(0.2);
      rows.slice(0, 10).forEach((row) => {
        columns.forEach((col, idx) => {
          const value = col.format ? col.format(row[col.key], row) : row[col.key];
          doc.text(value || '', { continued: idx !== columns.length - 1 });
        });
        doc.moveDown(0.1);
      });
      if (rows.length > 10) {
        doc.text(`(+${rows.length - 10} more entries)`);
      }
      doc.moveDown();
    };

    addTable('Recent Income', income, [
      { key: 'date', header: 'Date', format: (val) => formatDate(val) },
      { key: 'description', header: 'Description' },
      { key: 'category', header: 'Category' },
      { key: 'amount', header: 'Amount', format: formatCurrency },
    ]);

    addTable('Recent Expenses', expenses, [
      { key: 'date', header: 'Date', format: (val) => formatDate(val) },
      { key: 'description', header: 'Description' },
      { key: 'category', header: 'Category' },
      { key: 'amount', header: 'Amount', format: formatCurrency },
    ]);

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
