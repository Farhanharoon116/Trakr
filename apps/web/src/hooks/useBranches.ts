import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Branch } from '@bizos/shared';

export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    staleTime: 5 * 60 * 1000,
  });
}
