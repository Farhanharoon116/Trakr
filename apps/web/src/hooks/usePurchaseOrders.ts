import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { PurchaseOrder, PurchaseOrderItem, Supplier, Branch, Product } from '@bizos/shared';

export interface PurchaseOrderFull extends PurchaseOrder {
  suppliers: Pick<Supplier, 'name' | 'phone' | 'email' | 'address' | 'ntn'> | null;
  branches: Pick<Branch, 'name'> | null;
  purchase_order_items: (PurchaseOrderItem & { products: Pick<Product, 'name_en' | 'sku'> | null })[];
}

interface POsPage {
  data: PurchaseOrderFull[];
  total: number;
  page: number;
  limit: number;
}

export function usePurchaseOrders(status?: string, page = 1) {
  const params = new URLSearchParams({ page: String(page), limit: '30' });
  if (status) params.set('status', status);
  return useQuery({
    queryKey: ['purchase-orders', status, page],
    queryFn: () => api.get<POsPage>(`/purchase-orders?${params}`),
    staleTime: 30 * 1000,
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => api.get<PurchaseOrderFull>(`/purchase-orders/${id}`),
    enabled: !!id,
  });
}

interface CreatePOInput {
  branch_id: string;
  supplier_id: string;
  expected_date?: string;
  notes?: string;
  status: 'draft' | 'sent';
  items: { product_id: string; qty_ordered: number; unit_cost: number }[];
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePOInput) => api.post<PurchaseOrder>('/purchase-orders', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string; status?: 'draft' | 'sent' | 'cancelled'; expected_date?: string; notes?: string }) =>
      api.patch<PurchaseOrder>(`/purchase-orders/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });
}

export function useReceiveGoods() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      items,
    }: {
      id: string;
      items: { item_id: string; qty_received: number }[];
    }) => api.post<PurchaseOrder>(`/purchase-orders/${id}/receive`, { items }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });
}
