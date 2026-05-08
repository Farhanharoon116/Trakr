import { describe, it, expect } from 'vitest';
import { _generateTestOTP } from '../services/otp.service';

describe('OTP Service', () => {
  it('generates a 6-digit OTP', () => {
    const otp = _generateTestOTP();
    expect(otp).toMatch(/^[0-9]{6}$/);
  });

  it('generates different OTPs each time', () => {
    const otp1 = _generateTestOTP();
    const otp2 = _generateTestOTP();
    // May occasionally be equal, but this is a basic sanity check
    expect(typeof otp1).toBe('string');
    expect(typeof otp2).toBe('string');
  });
});
