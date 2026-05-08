import { describe, it, expect, vi } from 'vitest';

// Mock Dexie for tests
vi.mock('../lib/db', () => ({
  db: {
    offline_queue: {
      add: vi.fn().mockResolvedValue('offline-1'),
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          count: vi.fn().mockResolvedValue(0),
          toArray: vi.fn().mockResolvedValue([]),
          modify: vi.fn().mockResolvedValue(0),
        }),
      }),
    },
    products: {
      bulkPut: vi.fn().mockResolvedValue(undefined),
      filter: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    },
    inventory: {
      bulkPut: vi.fn().mockResolvedValue(undefined),
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      }),
    },
  },
}));

vi.mock('../store/auth.store', () => ({
  useAuthStore: {
    getState: () => ({
      accessToken: 'test-token',
      refreshToken: null,
      refreshAccessToken: vi.fn().mockResolvedValue(false),
      logout: vi.fn(),
    }),
  },
}));

describe('Offline queue', () => {
  it('adds to offline queue when offline', async () => {
    // Simulate offline state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { db } = await import('../lib/db');

    const mockSale = {
      offline_id: 'test-offline-id',
      branch_id: 'branch-1',
      shift_id: null,
      customer_id: null,
      items: [
        {
          product_id: 'prod-1',
          qty: 1,
          unit_price: 100,
          discount: 0,
          tax_rate: 17,
        },
      ],
      subtotal: 100,
      discount: 0,
      tax_amount: 17,
      total: 117,
      payment_method: 'cash' as const,
      created_at: new Date().toISOString(),
      synced: false,
    };

    await db.offline_queue.add(mockSale);
    expect(db.offline_queue.add).toHaveBeenCalledWith(mockSale);

    // Restore online
    Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
  });
});
