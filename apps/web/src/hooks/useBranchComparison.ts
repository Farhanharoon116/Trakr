import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface BranchRevenue {
  branch_id: string;
  branch_name: string;
  total_revenue: number;
}

export interface InventoryComparison {
  branch_id: string;
  branch_name: string;
  total_skus: number;
  low_stock_count: number;
}

export interface BranchComparisonData {
  revenue_chart: Record<string, unknown>[];
  revenue_totals: BranchRevenue[];
  inventory_comparison: InventoryComparison[];
}

export function useBranchComparison() {
  return useQuery({
    queryKey: ['branch-comparison'],
    queryFn: () => api.get<BranchComparisonData>('/reports/branch-comparison'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInventoryTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      product_id: string;
      from_branch_id: string;
      to_branch_id: string;
      qty: number;
      reason?: string;
    }) => api.post<{ success: boolean; qty_transferred: number }>('/inventory/transfer', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['branch-comparison'] });
    },
  });
}
