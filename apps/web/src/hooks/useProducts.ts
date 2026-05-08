import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { db, type LocalProduct } from '../lib/db';
import type { Product } from '@bizos/shared';

interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

export function useProducts(search?: string, categoryId?: string) {
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

  const params = new URLSearchParams({ limit: '200', is_active: 'true' });
  if (search) params.set('search', search);
  if (categoryId) params.set('category_id', categoryId);

  const query = useQuery({
    queryKey: ['products', search, categoryId],
    queryFn: async () => {
      const result = await api.get<ProductsResponse>(`/products?${params}`);
      // Sync to Dexie
      await db.products.bulkPut(
        result.data.map((p) => ({ ...p, cached_at: new Date().toISOString() }))
      );
      return result.data;
    },
    enabled: isOnline,
    staleTime: 5 * 60 * 1000,
    refetchInterval: isOnline ? 30 * 1000 : false,
  });

  const [offlineProducts, setOfflineProducts] = useState<LocalProduct[]>([]);

  useEffect(() => {
    if (!isOnline || query.isError) {
      db.products
        .filter((p) => {
          if (!p.is_active) return false;
          if (search) {
            const s = search.toLowerCase();
            return (
              p.name_en.toLowerCase().includes(s) ||
              (p.name_ur?.toLowerCase().includes(s) ?? false) ||
              (p.sku?.toLowerCase().includes(s) ?? false)
            );
          }
          if (categoryId) return p.category_id === categoryId;
          return true;
        })
        .toArray()
        .then(setOfflineProducts)
        .catch(() => setOfflineProducts([]));
    }
  }, [isOnline, query.isError, search, categoryId]);

  return {
    products: isOnline ? (query.data ?? offlineProducts) : offlineProducts,
    isLoading: query.isLoading && isOnline,
    isError: query.isError,
    isOnline,
  };
}
