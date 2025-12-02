const expensesKeywords = [
  { category: 'Travel', words: ['fuel', 'petrol', 'diesel', 'taxi', 'train', 'bus', 'mileage', 'parking', 'toll'] },
  { category: 'Office', words: ['office', 'supplies', 'stationery', 'computer', 'software', 'printer', 'ink', 'furniture'] },
  { category: 'Meals', words: ['meal', 'restaurant', 'food', 'lunch', 'dinner', 'coffee', 'catering', 'hospitality'] },
  { category: 'Communications', words: ['phone', 'mobile', 'internet', 'broadband', 'telephone', 'data', 'wifi'] },
  { category: 'Equipment', words: ['equipment', 'tools', 'machinery', 'repair', 'maintenance', 'parts'] },
  { category: 'Marketing', words: ['marketing', 'advertising', 'promotion', 'website', 'social media', 'seo'] },
  { category: 'Professional Services', words: ['legal', 'accountant', 'consultant', 'professional', 'audit', 'tax advisor'] },
  { category: 'Utilities', words: ['utility', 'electricity', 'gas', 'water', 'heating', 'power'] },
  { category: 'Insurance', words: ['insurance', 'premium', 'coverage', 'liability'] },
  { category: 'Training', words: ['training', 'course', 'education', 'seminar', 'workshop', 'conference'] },
  { category: 'Entertainment', words: ['entertainment', 'event', 'ticket', 'theatre', 'concert'] },
  { category: 'Medical', words: ['medical', 'health', 'doctor', 'hospital', 'pharmacy'] },
  { category: 'Subscriptions', words: ['subscription', 'membership', 'magazine', 'journal', 'software license'] },
];

export function categorizeExpenseText(text) {
  const lowerText = (text || '').toLowerCase();
  for (const entry of expensesKeywords) {
    if (entry.words.some((word) => lowerText.includes(word))) {
      return entry.category;
    }
  }
  return 'Other';
}

export function categorizeIncomeText(text) {
  const lowerText = (text || '').toLowerCase();
  if (['service', 'consult', 'project', 'contract'].some((word) => lowerText.includes(word))) {
    return 'Services';
  }
  if (['sale', 'product', 'subscription', 'invoice'].some((word) => lowerText.includes(word))) {
    return 'Sales';
  }
  if (['royalty', 'license'].some((word) => lowerText.includes(word))) {
    return 'Royalties';
  }
  return 'Other';
}
