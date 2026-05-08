import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { usePOSStore } from '../store/pos.store';
import type { Shift } from '@bizos/shared';

export function useShift() {
  const queryClient = useQueryClient();
  const setActiveShift = usePOSStore((s) => s.setActiveShift);

  const currentShiftQuery = useQuery({
    queryKey: ['shifts', 'current'],
    queryFn: async () => {
      const shifts = await api.get<Shift[]>('/shifts/current');
      const myShift = shifts[0] ?? null;
      setActiveShift(myShift);
      return myShift;
    },
    staleTime: 60 * 1000,
  });

  const openShiftMutation = useMutation({
    mutationFn: (params: { branch_id: string; opening_cash: number }) =>
      api.post<Shift>('/shifts/open', params),
    onSuccess: (shift) => {
      setActiveShift(shift);
      queryClient.invalidateQueries({ queryKey: ['shifts'] }).catch(() => void 0);
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: (params: { shiftId: string; closing_cash: number; notes?: string }) =>
      api.post<Shift>(`/shifts/${params.shiftId}/close`, {
        closing_cash: params.closing_cash,
        notes: params.notes,
      }),
    onSuccess: () => {
      setActiveShift(null);
      queryClient.invalidateQueries({ queryKey: ['shifts'] }).catch(() => void 0);
    },
  });

  return {
    currentShift: currentShiftQuery.data,
    isLoadingShift: currentShiftQuery.isLoading,
    openShift: openShiftMutation.mutateAsync,
    closeShift: closeShiftMutation.mutateAsync,
    isOpeningShift: openShiftMutation.isPending,
    isClosingShift: closeShiftMutation.isPending,
  };
}
