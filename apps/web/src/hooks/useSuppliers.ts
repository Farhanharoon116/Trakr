import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Supplier } from '@bizos/shared';

interface SuppliersPage {
  data: Supplier[];
  total: number;
  page: number;
  limit: number;
}

export function useSuppliers(search?: string, page = 1) {
  const params = new URLSearchParams({ page: String(page), limit: '30' });
  if (search) params.set('search', search);
  return useQuery({
    queryKey: ['suppliers', search, page],
    queryFn: () => api.get<SuppliersPage>(`/suppliers?${params}`),
    staleTime: 60 * 1000,
  });
}

export function useAllSuppliers() {
  return useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () =>
      api.get<SuppliersPage>('/suppliers?limit=200').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

type CreateSupplierInput = Pick<Supplier, 'name'> &
  Partial<Pick<Supplier, 'phone' | 'email' | 'address' | 'ntn' | 'notes'>>;

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSupplierInput) =>
      api.post<Supplier>('/suppliers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CreateSupplierInput> & { id: string }) =>
      api.patch<Supplier>(`/suppliers/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}
