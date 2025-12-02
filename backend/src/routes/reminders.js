const express = require('express');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { getObligations } = require('../services/obligations');

const router = express.Router();

const getLatestCalculation = (userId) => new Promise((resolve, reject) => {
  db.get('SELECT * FROM calculations WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId], (err, row) => {
    if (err) return reject(err);
    resolve(row);
  });
});

const formatCurrency = (value) => `£${Number.parseFloat(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
};

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [obligations, calc] = await Promise.all([
      getObligations(userId),
      getLatestCalculation(userId),
    ]);

    const reminders = [];
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    obligations
      .filter((o) => o.status !== 'fulfilled')
      .forEach((obligation) => {
        const dueTime = new Date(`${obligation.dueDate}T23:59:59Z`).getTime();
        if (dueTime < now) {
          reminders.push({
            type: 'obligation',
            severity: 'high',
            message: `Submission for ${obligation.periodKey} is overdue (${formatDate(obligation.dueDate)}).`,
          });
        } else if (dueTime - now <= THIRTY_DAYS) {
          reminders.push({
            type: 'obligation',
            severity: 'medium',
            message: `Submission for ${obligation.periodKey} is due by ${formatDate(obligation.dueDate)}.`,
          });
        }
      });

    if (calc) {
      if (calc.profit < 0) {
        reminders.push({
          type: 'finance',
          severity: 'high',
          message: 'Your expenses exceed income. Review spending or update revenue targets.',
        });
      } else {
        const margin = (calc.profit / (calc.total_income || 1)) * 100;
        if (margin < 10) {
          reminders.push({
            type: 'finance',
            severity: 'medium',
            message: `Profit margin is ${margin.toFixed(1)}%. Consider revisiting pricing or costs.`,
          });
        }
      }

      if (calc.tax_estimate > 0) {
        reminders.push({
          type: 'tax',
          severity: 'info',
          message: `Set aside ${formatCurrency(calc.tax_estimate)} for income tax.`,
        });
      }
    } else {
      reminders.push({
        type: 'setup',
        severity: 'info',
        message: 'Add income and expenses to generate tax calculations.',
      });
    }

    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
