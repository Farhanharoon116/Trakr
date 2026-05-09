import { describe, it, expect } from 'vitest';
import { validateNTN, calculateGST, generateGSTReturn } from './index';

describe('validateNTN', () => {
  it('accepts valid NTN format (7-digit dash 1-digit)', () => {
    expect(validateNTN('1234567-8')).toBe(true);
    expect(validateNTN('0000000-0')).toBe(true);
    expect(validateNTN('9999999-9')).toBe(true);
  });

  it('accepts valid CNIC format (XXXXX-XXXXXXX-X)', () => {
    expect(validateNTN('12345-1234567-8')).toBe(true);
    expect(validateNTN('00000-0000000-0')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(validateNTN('')).toBe(false);
    expect(validateNTN('123456-8')).toBe(false);       // only 6 digits before dash
    expect(validateNTN('12345678-9')).toBe(false);     // 8 digits before dash
    expect(validateNTN('1234567')).toBe(false);        // no dash
    expect(validateNTN('1234567-89')).toBe(false);     // 2 digits after dash
    expect(validateNTN('ABCDEFG-H')).toBe(false);      // letters
    expect(validateNTN('12345-123456-8')).toBe(false); // CNIC with 6 middle digits
  });

  it('rejects NTN with letters', () => {
    expect(validateNTN('123456A-8')).toBe(false);
  });
});

describe('calculateGST', () => {
  it('calculates 17% GST correctly', () => {
    expect(calculateGST(1000, 17)).toBe(170);
    expect(calculateGST(100, 17)).toBe(17);
  });

  it('returns 0 for zero rate', () => {
    expect(calculateGST(1000, 0)).toBe(0);
    expect(calculateGST(0, 17)).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    // 100 * 17 / 100 = 17.00 exact
    expect(calculateGST(100, 17)).toBe(17);
    // 1 * 17 / 100 = 0.17
    expect(calculateGST(1, 17)).toBe(0.17);
    // Rounding: 1.005 * 17 / 100 = 0.17085 → 0.17
    expect(calculateGST(1.005, 17)).toBe(0.17);
    // 10.01 * 17 / 100 = 1.7017 → 1.70
    expect(calculateGST(10.01, 17)).toBe(1.7);
  });

  it('handles standard GST amounts', () => {
    expect(calculateGST(5000, 17)).toBe(850);
    expect(calculateGST(2500, 5)).toBe(125);
  });
});

describe('generateGSTReturn', () => {
  const sampleSales = [
    {
      receipt_number: 'INV-001',
      created_at: '2024-01-15T10:30:00Z',
      total: 1170,
      tax_amount: 170,
      customer_name: 'Ali Khan',
      customer_ntn: '1234567-8',
    },
    {
      receipt_number: 'INV-002',
      created_at: '2024-01-16T11:00:00Z',
      total: 585,
      tax_amount: 85,
    },
  ];

  it('includes correct CSV header', () => {
    const csv = generateGSTReturn(sampleSales, 'monthly');
    const lines = csv.split('\n');
    expect(lines[0]).toBe('SR,Invoice#,Date,Buyer Name,Buyer NTN,Taxable Value,GST Amount');
  });

  it('has correct number of data rows', () => {
    const csv = generateGSTReturn(sampleSales, 'monthly');
    const lines = csv.split('\n');
    expect(lines.length).toBe(3); // header + 2 rows
  });

  it('formats first data row correctly', () => {
    const csv = generateGSTReturn(sampleSales, 'monthly');
    const lines = csv.split('\n');
    const row1 = lines[1] ?? '';
    expect(row1).toContain('INV-001');
    expect(row1).toContain('2024-01-15');
    expect(row1).toContain('Ali Khan');
    expect(row1).toContain('1234567-8');
    expect(row1).toContain('1000.00');
    expect(row1).toContain('170.00');
  });

  it('uses Walk-in Customer for sales without customer name', () => {
    const csv = generateGSTReturn(sampleSales, 'monthly');
    const lines = csv.split('\n');
    const row2 = lines[2] ?? '';
    expect(row2).toContain('Walk-in Customer');
  });

  it('handles empty sales array', () => {
    const csv = generateGSTReturn([], 'monthly');
    const lines = csv.split('\n');
    expect(lines.length).toBe(1); // only header
  });

  it('works for quarterly period', () => {
    const csv = generateGSTReturn(sampleSales, 'quarterly');
    expect(csv).toContain('SR,Invoice#');
  });
});
