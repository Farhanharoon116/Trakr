import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createHash } from 'crypto';
import { z } from 'zod';
import { OTPRequestSchema, OTPVerifySchema } from '@bizos/shared';
import { supabase } from '../db';
import { sendOTP, verifyOTP } from '../services/otp.service';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

export const authRouter = Router();

const otpRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => {
    const body = req.body as Record<string, unknown>;
    return String(body['phone'] ?? req.ip);
  },
  message: { error: 'Too many OTP requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post(
  '/send-otp',
  otpRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { phone } = OTPRequestSchema.parse(req.body);
    await sendOTP(phone);
    res.json({ success: true, expires_in: 300 });
  })
);

authRouter.post(
  '/verify-otp',
  asyncHandler(async (req: Request, res: Response) => {
    const { phone, otp } = OTPVerifySchema.parse(req.body);

    const valid = await verifyOTP(phone, otp);
    if (!valid) {
      throw new UnauthorizedError('Invalid or expired OTP');
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, business_id, role, branch_id, name')
      .eq('phone', phone)
      .single();

    if (!user) {
      const setupToken = signAccessToken({
        userId: phone,
        businessId: '',
        role: 'owner',
        branchId: null,
      });
      res.json({ new_user: true, setup_token: setupToken });
      return;
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', user.business_id)
      .single();

    const accessToken = signAccessToken({
      userId: user.id as string,
      businessId: user.business_id as string,
      role: user.role as 'owner' | 'manager' | 'cashier' | 'employee',
      branchId: (user.branch_id as string | null) ?? null,
    });

    const tokenId = crypto.randomUUID();
    const refreshToken = signRefreshToken({ userId: user.id as string, tokenId });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('refresh_tokens').insert({
      id: tokenId,
      user_id: user.id,
      token_hash: createHash('sha256').update(refreshToken).digest('hex'),
      expires_at: expiresAt,
    });

    res.json({ access_token: accessToken, refresh_token: refreshToken, user, business });
  })
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({ refresh_token: z.string() });
    const { refresh_token } = schema.parse(req.body);

    const payload = verifyRefreshToken(refresh_token);

    const { data: tokenRecord } = await supabase
      .from('refresh_tokens')
      .select('id, user_id, expires_at, is_revoked')
      .eq('id', payload.tokenId)
      .single();

    if (!tokenRecord || tokenRecord.is_revoked || new Date(tokenRecord.expires_at as string) < new Date()) {
      throw new UnauthorizedError('Refresh token is invalid or expired');
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, business_id, role, branch_id')
      .eq('id', tokenRecord.user_id)
      .single();

    if (!user) throw new UnauthorizedError('User not found');

    const accessToken = signAccessToken({
      userId: user.id as string,
      businessId: user.business_id as string,
      role: user.role as 'owner' | 'manager' | 'cashier' | 'employee',
      branchId: (user.branch_id as string | null) ?? null,
    });

    res.json({ access_token: accessToken });
  })
);

authRouter.post(
  '/setup-business',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      business_name: z.string().min(1).max(255),
      phone: z.string().regex(/^\+92[0-9]{10}$/),
      plan: z.enum(['starter', 'growth', 'enterprise']).default('starter'),
    });

    const { business_name, phone, plan } = schema.parse(req.body);

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      throw new AppError('Business already set up for this phone number', 409);
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      phone: phone.replace('+', ''),
      phone_confirm: true,
    });

    if (authError || !authUser.user) {
      logger.error({ authError }, 'Failed to create auth user');
      throw new AppError('Failed to create user account', 500);
    }

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .insert({ name: business_name, owner_id: authUser.user.id, plan })
      .select()
      .single();

    if (bizError || !business) {
      logger.error({ bizError }, 'Failed to create business');
      throw new AppError('Failed to create business', 500);
    }

    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .insert({ business_id: business.id, name: 'Main Branch' })
      .select()
      .single();

    if (branchError || !branch) {
      logger.error({ branchError }, 'Failed to create branch');
      throw new AppError('Failed to create default branch', 500);
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        business_id: business.id,
        phone,
        name: 'Owner',
        role: 'owner',
      })
      .select()
      .single();

    if (userError || !user) {
      logger.error({ userError }, 'Failed to create user profile');
      throw new AppError('Failed to create user profile', 500);
    }

    const accessToken = signAccessToken({
      userId: user.id as string,
      businessId: business.id as string,
      role: 'owner',
      branchId: null,
    });

    const tokenId = crypto.randomUUID();
    const refreshToken = signRefreshToken({ userId: user.id as string, tokenId });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('refresh_tokens').insert({
      id: tokenId,
      user_id: user.id,
      token_hash: createHash('sha256').update(refreshToken).digest('hex'),
      expires_at: expiresAt,
    });

    res.status(201).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
      business,
      branch,
    });
  })
);
