import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Category } from '@bizos/shared';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name_en: string; name_ur?: string; color?: string }) =>
      api.post<Category>('/categories', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] }).catch(() => void 0);
    },
  });
}
