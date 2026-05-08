import { describe, it, expect } from 'vitest';
import { parsePagination, paginate } from '../utils/pagination';

describe('parsePagination', () => {
  it('defaults to page=1, limit=20', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20 });
  });

  it('parses valid page and limit strings', () => {
    expect(parsePagination({ page: '3', limit: '50' })).toEqual({ page: 3, limit: 50 });
  });

  it('clamps page to minimum of 1', () => {
    expect(parsePagination({ page: '0' })).toEqual({ page: 1, limit: 20 });
    expect(parsePagination({ page: '-5' })).toEqual({ page: 1, limit: 20 });
  });

  it('clamps limit to minimum of 1 (non-zero invalid values)', () => {
    expect(parsePagination({ limit: '-10' })).toEqual({ page: 1, limit: 1 });
    expect(parsePagination({ limit: '0.5' })).toEqual({ page: 1, limit: 1 }); // 0.5 → Math.trunc via Number → Math.max(1,0) = 1... actually Number('0.5')=0.5, max(1,0.5)=1
  });

  it('clamps limit to maximum of 100', () => {
    expect(parsePagination({ limit: '200' })).toEqual({ page: 1, limit: 100 });
    expect(parsePagination({ limit: '999' })).toEqual({ page: 1, limit: 100 });
  });

  it('falls back to defaults for non-numeric values', () => {
    expect(parsePagination({ page: 'abc', limit: 'xyz' })).toEqual({ page: 1, limit: 20 });
  });

  it('accepts numeric values directly', () => {
    expect(parsePagination({ page: 2, limit: 30 })).toEqual({ page: 2, limit: 30 });
  });
});

describe('paginate', () => {
  it('returns correct structure', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const result = paginate(items, 50, { page: 2, limit: 10 });
    expect(result).toEqual({
      data: items,
      total: 50,
      page: 2,
      limit: 10,
      totalPages: 5,
    });
  });

  it('calculates totalPages by ceiling division', () => {
    expect(paginate([], 21, { page: 1, limit: 10 }).totalPages).toBe(3);
    expect(paginate([], 20, { page: 1, limit: 10 }).totalPages).toBe(2);
    expect(paginate([], 1, { page: 1, limit: 10 }).totalPages).toBe(1);
  });

  it('handles zero total', () => {
    expect(paginate([], 0, { page: 1, limit: 20 }).totalPages).toBe(0);
  });

  it('passes data through unchanged', () => {
    const data = ['a', 'b', 'c'];
    expect(paginate(data, 3, { page: 1, limit: 20 }).data).toBe(data);
  });
});
