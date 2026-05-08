import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';

// Mock config
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
  },
}));

describe('JWT utilities', () => {
  const payload = {
    userId: 'user-123',
    businessId: 'biz-456',
    role: 'owner' as const,
    branchId: null,
  };

  it('signs and verifies access token', () => {
    const token = signAccessToken(payload);
    expect(typeof token).toBe('string');
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.businessId).toBe(payload.businessId);
    expect(decoded.role).toBe(payload.role);
  });

  it('signs and verifies refresh token', () => {
    const refreshPayload = { userId: 'user-123', tokenId: 'token-abc' };
    const token = signRefreshToken(refreshPayload);
    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe(refreshPayload.userId);
    expect(decoded.tokenId).toBe(refreshPayload.tokenId);
  });

  it('throws UnauthorizedError for invalid access token', () => {
    expect(() => verifyAccessToken('invalid-token')).toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError for invalid refresh token', () => {
    expect(() => verifyRefreshToken('bad-token')).toThrow(UnauthorizedError);
  });
});

describe('Auth middleware', () => {
  it('includes businessId in JWT payload', () => {
    const payload = {
      userId: 'user-123',
      businessId: 'biz-456',
      role: 'owner' as const,
      branchId: null,
    };
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.businessId).toBe('biz-456');
  });
});
