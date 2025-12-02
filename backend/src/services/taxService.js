// Tax calculation functions
const calculateProfit = (income, expenses) => income - expenses;

const calculateVAT = (profit) => profit * 0.2; // Simplified

const calculateTaxEstimate = (profit) => {
  const taxFree = 12570; // UK personal allowance
  if (profit <= taxFree) return 0;
  return (profit - taxFree) * 0.2; // Basic rate
};

const calculateNIEstimate = (profit) => {
  const threshold = 12570;
  if (profit <= threshold) return 0;
  return (profit - threshold) * 0.08; // Class 2/4 NI
};

module.exports = { calculateProfit, calculateVAT, calculateTaxEstimate, calculateNIEstimate };