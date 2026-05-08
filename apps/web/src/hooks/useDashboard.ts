import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface DashboardData {
  today_revenue: number;
  yesterday_revenue: number;
  transaction_count: number;
  low_stock_count: number;
  total_inventory_items: number;
  active_staff_count: number;
  sales_chart: { date: string; revenue: number }[];
  top_products: { name: string; revenue: number }[];
  recent_transactions: {
    id: string;
    receipt_number: string;
    created_at: string;
    total: number;
    payment_method: string;
    cashier_id: string;
    sale_items: unknown[];
  }[];
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/reports/dashboard'),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}
