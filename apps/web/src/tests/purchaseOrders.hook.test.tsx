import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

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
import { usePurchaseOrders } from '../hooks/usePurchaseOrders';

const mockPOPage = {
  data: [
    {
      id: 'po-1',
      po_number: 'PO-00001',
      business_id: 'biz-1',
      branch_id: 'br-1',
      supplier_id: 'sup-1',
      status: 'draft',
      total_amount: 5000,
      notes: null,
      expected_date: null,
      received_at: null,
      created_by: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      suppliers: { name: 'ABC Suppliers', phone: null },
      branches: { name: 'Main Branch' },
      purchase_order_items: [],
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

describe('usePurchaseOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches purchase orders and returns data', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockPOPage);

    const { result } = renderHook(() => usePurchaseOrders(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0]?.po_number).toBe('PO-00001');
  });

  it('filters by status when provided', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [], total: 0, page: 1, limit: 30 });

    const { result } = renderHook(() => usePurchaseOrders('received'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => result.current.isSuccess);

    expect(vi.mocked(api.get)).toHaveBeenCalledWith(
      expect.stringContaining('status=received')
    );
  });

  it('handles API failure gracefully', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => usePurchaseOrders(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('returns empty data on empty response', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [], total: 0, page: 1, limit: 30 });

    const { result } = renderHook(() => usePurchaseOrders(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(0);
    expect(result.current.data?.total).toBe(0);
  });

  it('includes page param in request URL', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [], total: 0, page: 2, limit: 30 });

    const { result } = renderHook(() => usePurchaseOrders(undefined, 2), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => result.current.isSuccess);

    expect(vi.mocked(api.get)).toHaveBeenCalledWith(
      expect.stringContaining('page=2')
    );
  });
});
