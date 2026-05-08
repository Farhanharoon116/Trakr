import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { db } from '../lib/db';
import type { CreateSale } from '@bizos/shared';

// Simple UUID v4 without package dependency
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useSales() {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const refreshPendingCount = useCallback(async () => {
    const count = await db.offline_queue.where('synced').equals(0).count();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshPendingCount().catch(() => void 0);
  }, [refreshPendingCount]);

  const syncOfflineQueue = useCallback(async () => {
    const pending = await db.offline_queue.where('synced').equals(0).toArray();
    if (pending.length === 0) return;

    try {
      await api.post('/sales/bulk-sync', { sales: pending });
      await db.offline_queue.where('synced').equals(0).modify({ synced: true });
      setPendingCount(0);
      await queryClient.invalidateQueries({ queryKey: ['sales'] });
    } catch {
      // Will retry on next online event
    }
  }, [queryClient]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      syncOfflineQueue().catch(() => void 0);
    }
  }, [isOnline, syncOfflineQueue]);

  const createSaleMutation = useMutation({
    mutationFn: async (saleData: CreateSale) => {
      const offlineId = saleData.offline_id ?? generateUUID();
      const saleWithId = { ...saleData, offline_id: offlineId };

      if (!navigator.onLine) {
        await db.offline_queue.add({
          ...saleWithId,
          created_at: new Date().toISOString(),
          synced: false,
        });
        setPendingCount((prev) => prev + 1);
        return { offline: true, offline_id: offlineId };
      }

      return api.post('/sales', saleWithId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] }).catch(() => void 0);
    },
  });

  return {
    createSale: createSaleMutation.mutateAsync,
    isCreating: createSaleMutation.isPending,
    pendingCount,
    syncOfflineQueue,
    isOnline,
  };
}
