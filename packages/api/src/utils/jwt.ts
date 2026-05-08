import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from './errors';

export interface JwtPayload {
  userId: string;
  businessId: string;
  role: 'owner' | 'manager' | 'cashier' | 'employee';
  branchId: string | null;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload & {
      iat: number;
      exp: number;
    };
    return {
      userId: decoded.userId,
      businessId: decoded.businessId,
      role: decoded.role,
      branchId: decoded.branchId,
    };
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as RefreshTokenPayload & {
      iat: number;
      exp: number;
    };
    return {
      userId: decoded.userId,
      tokenId: decoded.tokenId,
    };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}
