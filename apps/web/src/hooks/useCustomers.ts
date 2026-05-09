import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Customer } from '@bizos/shared';

interface CustomerPurchase {
  id: string;
  receipt_number: string;
  total: number;
  payment_method: string;
  created_at: string;
  sale_items: { id: string }[];
}

interface CreateCustomerInput {
  name?: string;
  phone: string;
  email?: string;
}

interface UpdateCustomerInput {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  loyalty_points?: number;
}

export function useCustomers(search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return useQuery({
    queryKey: ['customers', search ?? ''],
    queryFn: () => api.get<Customer[]>(`/customers${params}`),
    staleTime: 30 * 1000,
  });
}

export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get<Customer>(`/customers/${id}`),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerInput) =>
      api.post<Customer>('/customers', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] }).catch(() => void 0);
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateCustomerInput) =>
      api.patch<Customer>(`/customers/${id}`, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] }).catch(() => void 0);
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] }).catch(() => void 0);
    },
  });
}

export function useCustomerPurchases(id: string | null) {
  return useQuery({
    queryKey: ['customer-purchases', id],
    queryFn: () => api.get<CustomerPurchase[]>(`/customers/${id}/purchases`),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}
