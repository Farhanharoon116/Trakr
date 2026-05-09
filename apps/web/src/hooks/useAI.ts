import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface ForecastPrediction {
  date: string;
  predicted_revenue: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface ForecastResult {
  predictions: ForecastPrediction[];
  insights: string[];
  seasonality_flags: string[];
}

export interface ReorderSuggestion {
  product_id: string;
  product_name: string;
  days_until_stockout: number;
  recommended_qty: number;
  urgency: 'urgent' | 'soon' | 'monitor';
}

export function useSalesForecast(branchId?: string) {
  const params = branchId ? `?branch_id=${branchId}` : '';
  return useQuery({
    queryKey: ['ai-forecast', branchId],
    queryFn: () => api.get<ForecastResult>(`/ai/forecast${params}`),
    staleTime: 60 * 60 * 1000, // 1 hour — server caches for 24h anyway
    retry: false,
  });
}

export function useReorderSuggestions() {
  return useQuery({
    queryKey: ['ai-reorder'],
    queryFn: () => api.get<ReorderSuggestion[]>('/ai/reorder-suggestions'),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
}
