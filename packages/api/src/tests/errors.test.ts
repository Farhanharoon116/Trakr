import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from '../utils/errors';

describe('AppError', () => {
  it('constructs with message and default 500 status', () => {
    const err = new AppError('something broke');
    expect(err.message).toBe('something broke');
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
  });

  it('accepts custom statusCode and isOperational', () => {
    const err = new AppError('custom', 503, false);
    expect(err.statusCode).toBe(503);
    expect(err.isOperational).toBe(false);
  });

  it('is an instance of Error', () => {
    const err = new AppError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('NotFoundError', () => {
  it('defaults to 404 and standard message', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Resource not found');
  });

  it('accepts a custom message', () => {
    const err = new NotFoundError('Product not found');
    expect(err.message).toBe('Product not found');
    expect(err.statusCode).toBe(404);
  });

  it('is an instance of AppError', () => {
    expect(new NotFoundError()).toBeInstanceOf(AppError);
  });
});

describe('UnauthorizedError', () => {
  it('defaults to 401 status', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });

  it('accepts a custom message', () => {
    const err = new UnauthorizedError('Token expired');
    expect(err.message).toBe('Token expired');
  });
});

describe('ForbiddenError', () => {
  it('defaults to 403 status', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Forbidden');
  });
});

describe('ValidationError', () => {
  it('defaults to 400 status', () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Validation failed');
  });

  it('accepts a custom validation message', () => {
    const err = new ValidationError('phone is required');
    expect(err.message).toBe('phone is required');
    expect(err.statusCode).toBe(400);
  });
});
