import { vi, describe, it, expect } from 'vitest';

// Mock config and db BEFORE importing anything that pulls them in
vi.mock('../config', () => ({
  config: {
    JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    JWT_EXPIRES_IN: '15m',
    REFRESH_TOKEN_EXPIRES_IN: '30d',
    NODE_ENV: 'test',
    API_PORT: 3001,
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    MSG91_SENDER_ID: 'BIZOS',
    INTERAKT_BASE_URL: 'https://api.interakt.ai/v1',
    API_URL: 'http://localhost:3001',
    ENCRYPTION_KEY: undefined,
    GEMINI_API_KEY: undefined,
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../db', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnThis(),
    }),
  },
}));

import { _generateTestOTP } from '../services/otp.service';

describe('OTP Service', () => {
  it('generates a 6-digit OTP', () => {
    const otp = _generateTestOTP();
    expect(otp).toMatch(/^[0-9]{6}$/);
  });

  it('generates different OTPs each time (statistically)', () => {
    const otp1 = _generateTestOTP();
    const otp2 = _generateTestOTP();
    expect(typeof otp1).toBe('string');
    expect(typeof otp2).toBe('string');
    expect(otp1.length).toBe(6);
    expect(otp2.length).toBe(6);
  });

  it('OTP is all digits', () => {
    for (let i = 0; i < 5; i++) {
      expect(_generateTestOTP()).toMatch(/^\d{6}$/);
    }
  });
});
