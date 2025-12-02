const isValidAmount = (value) => {
  if (value === undefined || value === null) return false;
  const num = Number(value);
  if (Number.isNaN(num)) return false;
  return num >= 0;
};

const isValidDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const validateTransactionInput = ({ amount, date }) => {
  if (!isValidAmount(amount)) return 'Amount must be a number greater than or equal to 0.';
  if (!isValidDate(date)) return 'Provide a valid ISO date (YYYY-MM-DD).';
  return null;
};

const isValidEmail = (value) => {
  if (typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

module.exports = {
  isValidAmount,
  isValidDate,
  validateTransactionInput,
  isValidEmail,
};
