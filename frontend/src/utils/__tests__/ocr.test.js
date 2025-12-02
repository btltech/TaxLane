import { categorizeExpenseText } from '../categories';

describe('categorizeText', () => {
  test('identifies Travel-related text', () => {
    const text = 'Fuel receipt for petrol and parking';
    expect(categorizeExpenseText(text)).toBe('Travel');
  });

  test('identifies Office-related text', () => {
    const text = 'Bought office supplies: printer ink and stationery';
    expect(categorizeExpenseText(text)).toBe('Office');
  });

  test('identifies Meals', () => {
    const text = 'Restaurant lunch for client meeting';
    expect(categorizeExpenseText(text)).toBe('Meals');
  });

  test('falls back to Other when unknown', () => {
    const text = 'Some unusual text that does not match categories';
    expect(categorizeExpenseText(text)).toBe('Other');
});
});
