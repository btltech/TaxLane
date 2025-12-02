const express = require('express');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const q = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
  });
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) return reject(err);
    resolve(this);
  });
});

const formatCurrency = (value) => Number.parseFloat(value || 0).toFixed(2);
const startOfMonth = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
const endOfMonth = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));

async function getTotals(userId) {
  const incomeRow = await get('SELECT SUM(amount) as total FROM income WHERE user_id = ?', [userId]);
  const expenseRow = await get('SELECT SUM(amount) as total FROM expenses WHERE user_id = ?', [userId]);
  const totalIncome = incomeRow?.total || 0;
  const totalExpenses = expenseRow?.total || 0;
  const profit = totalIncome - totalExpenses;
  const vat = profit * 0.2;
  const taxFree = 12570;
  const taxEstimate = profit > taxFree ? (profit - taxFree) * 0.2 : 0;
  const niEstimate = profit > taxFree ? (profit - taxFree) * 0.08 : 0;
  return { totalIncome, totalExpenses, profit, vat, taxEstimate, niEstimate };
}

async function getMonthlyBreakdown(userId, monthsBack = 6) {
  const now = new Date();
  const data = [];
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const start = startOfMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)));
    const end = endOfMonth(start);
    // eslint-disable-next-line no-await-in-loop
    const incomeRow = await get('SELECT SUM(amount) as total FROM income WHERE user_id = ? AND date BETWEEN ? AND ?', [userId, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]);
    // eslint-disable-next-line no-await-in-loop
    const expenseRow = await get('SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND date BETWEEN ? AND ?', [userId, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]);
    const incomeTotal = incomeRow?.total || 0;
    const expenseTotal = expenseRow?.total || 0;
    data.push({
      month: start.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      income: incomeTotal,
      expenses: expenseTotal,
      profit: incomeTotal - expenseTotal,
    });
  }
  return data;
}

async function getTopClients(userId, limit = 5) {
  const rows = await q(
    `SELECT c.name as clientName, c.email, SUM(i.amount) as totalIncome
     FROM income i
     LEFT JOIN clients c ON c.id = i.client_id
     WHERE i.user_id = ?
     GROUP BY i.client_id
     ORDER BY totalIncome DESC
     LIMIT ?`,
    [userId, limit]
  );
  return rows.filter((row) => row.clientName).map((row) => ({
    name: row.clientName,
    email: row.email,
    totalIncome: row.totalIncome || 0,
  }));
}

async function getCategorySplit(userId) {
  const rows = await q(
    `SELECT category, SUM(amount) as total
     FROM expenses
     WHERE user_id = ?
     GROUP BY category
     ORDER BY total DESC`,
    [userId]
  );
  return rows.map((row) => ({
    category: row.category || 'Uncategorized',
    total: row.total || 0,
  }));
}

// Get tax calculations
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const totals = await getTotals(userId);
    const breakdown = await getMonthlyBreakdown(userId, 6);
    const topClients = await getTopClients(userId);
    const expenseCategories = await getCategorySplit(userId);

    await run(
      'INSERT OR REPLACE INTO calculations (user_id, total_income, total_expenses, profit, vat, tax_estimate, ni_estimate) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, totals.totalIncome, totals.totalExpenses, totals.profit, totals.vat, totals.taxEstimate, totals.niEstimate]
    );

    res.json({
      ...totals,
      monthlyBreakdown: breakdown,
      topClients,
      expenseCategories,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
