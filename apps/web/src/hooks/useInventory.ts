import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { db } from '../lib/db';
import type { Inventory } from '@bizos/shared';

interface InventoryWithDetails extends Inventory {
  products?: { name_en: string; sku: string | null; image_url: string | null };
  branches?: { name: string };
}

export function useInventory(branchId?: string) {
  const params = branchId ? `?branch_id=${branchId}` : '';
  return useQuery({
    queryKey: ['inventory', branchId],
    queryFn: async () => {
      const data = await api.get<InventoryWithDetails[]>(`/inventory${params}`);
      // Cache to Dexie
      await db.inventory.bulkPut(
        data.map((inv) => ({ ...inv, cached_at: new Date().toISOString() }))
      );
      return data;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useStockLevel(productId: string, branchId: string) {
  return useQuery({
    queryKey: ['stock', productId, branchId],
    queryFn: async () => {
      const item = await db.inventory
        .where('[product_id+branch_id]')
        .equals([productId, branchId])
        .first();
      return item?.qty_on_hand ?? 0;
    },
    staleTime: 30 * 1000,
  });
}
