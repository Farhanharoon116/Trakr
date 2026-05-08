import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AuditLog } from '@bizos/shared';

interface AuditLogFull extends AuditLog {
  users: { name: string; phone: string } | null;
}

interface AuditLogsPage {
  data: AuditLogFull[];
  total: number;
  page: number;
  limit: number;
}

export function useAuditLogs(params: {
  user_id?: string;
  table_name?: string;
  from?: string;
  to?: string;
  page?: number;
}) {
  const { page = 1, ...filters } = params;
  const qs = new URLSearchParams({ page: String(page), limit: '50' });
  if (filters.user_id) qs.set('user_id', filters.user_id);
  if (filters.table_name) qs.set('table_name', filters.table_name);
  if (filters.from) qs.set('from', filters.from);
  if (filters.to) qs.set('to', filters.to);

  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => api.get<AuditLogsPage>(`/audit-logs?${qs}`),
    staleTime: 30 * 1000,
  });
}
