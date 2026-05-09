import { describe, it, expect } from 'vitest';
import {
  OTPRequestSchema,
  OTPVerifySchema,
  CreateProductSchema,
  CreateEmployeeSchema,
  CreateSaleSchema,
} from '../schemas';

describe('OTPRequestSchema', () => {
  it('accepts a valid Pakistani phone number', () => {
    const result = OTPRequestSchema.safeParse({ phone: '+923001234567' });
    expect(result.success).toBe(true);
  });

  it('rejects a phone without +92 prefix', () => {
    const result = OTPRequestSchema.safeParse({ phone: '03001234567' });
    expect(result.success).toBe(false);
  });

  it('rejects a phone that is too short', () => {
    const result = OTPRequestSchema.safeParse({ phone: '+9230012345' });
    expect(result.success).toBe(false);
  });
});

describe('OTPVerifySchema', () => {
  it('accepts valid phone and 6-digit OTP', () => {
    const result = OTPVerifySchema.safeParse({ phone: '+923001234567', otp: '123456' });
    expect(result.success).toBe(true);
  });

  it('rejects OTP shorter than 6 digits', () => {
    const result = OTPVerifySchema.safeParse({ phone: '+923001234567', otp: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects alphabetical OTP', () => {
    const result = OTPVerifySchema.safeParse({ phone: '+923001234567', otp: 'abcdef' });
    expect(result.success).toBe(false);
  });
});

describe('CreateProductSchema', () => {
  const base = {
    name_en: 'Tea',
    price: 50,
  };

  it('accepts minimal valid product', () => {
    const result = CreateProductSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('applies default tax_rate of 17', () => {
    const result = CreateProductSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tax_rate).toBe(17);
  });

  it('rejects zero price', () => {
    const result = CreateProductSchema.safeParse({ ...base, price: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative price', () => {
    const result = CreateProductSchema.safeParse({ ...base, price: -10 });
    expect(result.success).toBe(false);
  });

  it('rejects tax_rate above 100', () => {
    const result = CreateProductSchema.safeParse({ ...base, tax_rate: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects empty name_en', () => {
    const result = CreateProductSchema.safeParse({ ...base, name_en: '' });
    expect(result.success).toBe(false);
  });
});

describe('CreateEmployeeSchema', () => {
  const base = { name: 'Ali Khan' };

  it('accepts minimal valid employee', () => {
    const result = CreateEmployeeSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('accepts valid CNIC format', () => {
    const result = CreateEmployeeSchema.safeParse({ ...base, cnic: '42101-1234567-1' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid CNIC format', () => {
    const result = CreateEmployeeSchema.safeParse({ ...base, cnic: '1234567890' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = CreateEmployeeSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

describe('CreateSaleSchema', () => {
  const validItem = {
    product_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    qty: 2,
    unit_price: 100,
    discount: 0,
    tax_rate: 17,
  };
  const base = {
    branch_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    items: [validItem],
    subtotal: 200,
    discount: 0,
    tax_amount: 34,
    total: 234,
    payment_method: 'cash',
  };

  it('accepts a valid sale', () => {
    const result = CreateSaleSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('rejects sale with empty items array', () => {
    const result = CreateSaleSchema.safeParse({ ...base, items: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid payment method', () => {
    const result = CreateSaleSchema.safeParse({ ...base, payment_method: 'bitcoin' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid payment methods', () => {
    const methods = ['cash', 'card', 'easypaisa', 'jazzcash', 'credit'];
    for (const method of methods) {
      const result = CreateSaleSchema.safeParse({ ...base, payment_method: method });
      expect(result.success).toBe(true);
    }
  });
});
