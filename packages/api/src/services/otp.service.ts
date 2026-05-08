import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabase } from '../db';
import { logger } from '../utils/logger';
import { config } from '../config';
import { AppError } from '../utils/errors';

const OTP_TTL_SECONDS = 300; // 5 minutes

export async function sendOTP(phone: string): Promise<void> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

  const { error } = await supabase.from('otp_sessions').upsert(
    { phone, otp_hash: hash, expires_at: expiresAt, attempts: 0 },
    { onConflict: 'phone' }
  );

  if (error) {
    logger.error({ error }, 'Failed to store OTP session');
    throw new AppError('Failed to initiate OTP', 500);
  }

  if (config.MSG91_API_KEY && config.MSG91_TEMPLATE_ID) {
    await sendViaMSG91(phone, otp);
  } else {
    logger.info({ phone, otp }, 'OTP (MSG91 not configured — dev mode)');
  }
}

export async function verifyOTP(phone: string, otp: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('otp_sessions')
    .select('otp_hash, expires_at, attempts')
    .eq('phone', phone)
    .single();

  if (error || !data) {
    return false;
  }

  if (new Date(data.expires_at as string) < new Date()) {
    await supabase.from('otp_sessions').delete().eq('phone', phone);
    return false;
  }

  const valid = await bcrypt.compare(otp, data.otp_hash as string);

  if (!valid) {
    await supabase
      .from('otp_sessions')
      .update({ attempts: (data.attempts as number) + 1 })
      .eq('phone', phone);
    return false;
  }

  await supabase.from('otp_sessions').delete().eq('phone', phone);
  return true;
}

async function sendViaMSG91(phone: string, otp: string): Promise<void> {
  const url = 'https://api.msg91.com/api/v5/otp';
  const body = {
    authkey: config.MSG91_API_KEY,
    mobile: phone.replace('+', ''),
    template_id: config.MSG91_TEMPLATE_ID,
    otp,
    sender: config.MSG91_SENDER_ID,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    logger.error({ status: res.status }, 'MSG91 OTP send failed');
    throw new AppError('Failed to send OTP via SMS', 502);
  }
}

// For testing: generate a deterministic token (not used in production)
export function _generateTestOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}
