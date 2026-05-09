import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock declarations MUST come before any static imports that pull in the
// modules being mocked (Vitest hoists vi.mock to the top of the file)
// ---------------------------------------------------------------------------
vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../store/auth.store', () => ({
  useAuthStore: {
    getState: () => ({
      accessToken: 'mock-token',
      refreshToken: null,
      refreshAccessToken: vi.fn().mockResolvedValue(false),
      logout: vi.fn(),
    }),
    setState: vi.fn(),
    subscribe: vi.fn(),
  },
}));

import { api } from '../lib/api';
import { useSuppliers, useAllSuppliers } from '../hooks/useSuppliers';

const mockSuppliersPage = {
  data: [
    {
      id: 'sup-1',
      business_id: 'biz-1',
      name: 'ABC Suppliers',
      phone: '+923001234567',
      email: 'abc@example.com',
      address: 'Lahore',
      ntn: null,
      notes: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  total: 1,
  page: 1,
  limit: 30,
};

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe('useSuppliers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns suppliers data on success', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockSuppliersPage);

    const { result } = renderHook(() => useSuppliers(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockSuppliersPage);
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0]?.name).toBe('ABC Suppliers');
  });

  it('builds the correct URL with search param', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [], total: 0, page: 1, limit: 30 });

    const { result } = renderHook(() => useSuppliers('abc', 2), { wrapper: makeWrapper() });

    await waitFor(() => result.current.isSuccess);

    expect(vi.mocked(api.get)).toHaveBeenCalledWith(
      expect.stringContaining('search=abc')
    );
    expect(vi.mocked(api.get)).toHaveBeenCalledWith(
      expect.stringContaining('page=2')
    );
  });

  it('handles API error gracefully', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSuppliers(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe('useAllSuppliers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches with limit=200 and returns the data array', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: mockSuppliersPage.data,
      total: 1,
      page: 1,
      limit: 200,
    });

    const { result } = renderHook(() => useAllSuppliers(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(api.get)).toHaveBeenCalledWith(
      expect.stringContaining('limit=200')
    );
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data).toHaveLength(1);
  });
});
