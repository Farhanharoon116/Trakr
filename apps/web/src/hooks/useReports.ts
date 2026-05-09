import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface GSTSaleRow {
  receipt_number: string;
  created_at: string;
  total: number;
  tax_amount: number;
  customers: { name: string } | null;
}

interface GSTReportResponse {
  sales: GSTSaleRow[];
  total_sales: number;
  total_tax: number;
  csv: string;
}

export function useGSTReport(from: string | null, to: string | null) {
  return useQuery({
    queryKey: ['gst-report', from, to],
    queryFn: () =>
      api.get<GSTReportResponse>(
        `/reports/fbr-gst?from=${encodeURIComponent(from ?? '')}&to=${encodeURIComponent(to ?? '')}`
      ),
    enabled: !!from && !!to,
    staleTime: 5 * 60 * 1000,
  });
}
