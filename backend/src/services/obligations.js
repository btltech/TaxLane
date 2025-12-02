const { db } = require('../config/database');

const formatDate = (date) => date.toISOString().split('T')[0];
const addMonths = (date, months) => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
};

const buildQuarterInfo = (year, quarter) => {
  const startMonth = (quarter - 1) * 3 + 1;
  const startDate = new Date(Date.UTC(year, startMonth - 1, 1));
  const endMonth = startMonth + 2;
  const endDate = new Date(Date.UTC(year, endMonth, 0));
  const dueDate = addMonths(endDate, 1);
  return {
    periodKey: `${year}-Q${quarter}`,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    dueDate: formatDate(dueDate),
  };
};

const parsePeriodKey = (periodKey) => {
  const match = /^(\d{4})-Q([1-4])$/.exec(periodKey || '');
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const quarter = parseInt(match[2], 10);
  return { year, quarter, ...buildQuarterInfo(year, quarter) };
};

async function ensureObligation(userId, info) {
  const result = await db.query('SELECT id FROM hmrc_obligations WHERE user_id = $1 AND period_key = $2', [userId, info.periodKey]);
  if (result.rows.length === 0) {
    await db.query(
      'INSERT INTO hmrc_obligations (user_id, period_key, start_date, end_date, due_date, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, info.periodKey, info.startDate, info.endDate, info.dueDate, 'open']
    );
  }
}

async function ensureObligationsForUser(userId) {
  const currentYear = new Date().getUTCFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  for (const year of years) {
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      const info = buildQuarterInfo(year, quarter);
      // eslint-disable-next-line no-await-in-loop
      await ensureObligation(userId, info);
    }
  }
}

function deriveStatus(row) {
  if (row.status === 'fulfilled') return 'fulfilled';
  const due = new Date(`${row.due_date}T23:59:59Z`);
  return due.getTime() < Date.now() ? 'overdue' : 'open';
}

async function getObligations(userId) {
  await ensureObligationsForUser(userId);
  const result = await db.query(
    `SELECT o.*, s.status AS submission_status, s.submitted_at
     FROM hmrc_obligations o
     LEFT JOIN mtd_submissions s ON s.id = o.submission_id
     WHERE o.user_id = $1
     ORDER BY o.start_date ASC`,
    [userId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    periodKey: row.period_key,
    startDate: row.start_date,
    endDate: row.end_date,
    dueDate: row.due_date,
    status: deriveStatus(row),
    baseStatus: row.status,
    submissionId: row.submission_id,
    submissionStatus: row.submission_status,
    submittedAt: row.submitted_at,
  }));
}

async function linkSubmissionToObligation(userId, periodKey, submissionId) {
  const info = parsePeriodKey(periodKey);
  if (!info) return;
  await ensureObligation(userId, info);
  await db.query(
    'UPDATE hmrc_obligations SET status = $1, submission_id = $2 WHERE user_id = $3 AND period_key = $4',
    ['fulfilled', submissionId, userId, info.periodKey]
  );
}

module.exports = {
  ensureObligationsForUser,
  getObligations,
  linkSubmissionToObligation,
  parsePeriodKey,
  buildQuarterInfo,
};
