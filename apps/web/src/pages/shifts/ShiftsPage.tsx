import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Clock4, X, Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import type { Shift } from '@bizos/shared';

interface ShiftWithDetails extends Shift {
  branches?: { name: string };
  users?: { name: string };
}

interface BranchItem {
  id: string;
  name: string;
}

function formatRs(n: number) {
  return `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

function duration(start: string): string {
  const ms = Date.now() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

// Open shift modal
function OpenShiftModal({ branches, onClose }: { branches: BranchItem[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const schema = z.object({
    branch_id: z.string().uuid('Select a branch'),
    opening_cash: z.number({ invalid_type_error: 'Required' }).nonnegative(),
  });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { opening_cash: 0 },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    await api.post('/shifts/open', values);
    toast.success('Shift opened');
    await queryClient.invalidateQueries({ queryKey: ['shifts'] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Open Shift</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Branch *</label>
            <select {...register('branch_id')} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option value="">-- Select branch --</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {errors.branch_id && <p className="mt-1 text-xs text-danger">{errors.branch_id.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Opening Cash (Rs) *</label>
            <input type="number" step="1" {...register('opening_cash', { valueAsNumber: true })} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {isSubmitting ? 'Opening...' : 'Open Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Close shift modal
function CloseShiftModal({ shift, onClose }: { shift: ShiftWithDetails; onClose: () => void }) {
  const queryClient = useQueryClient();
  const schema = z.object({
    closing_cash: z.number({ invalid_type_error: 'Required' }).nonnegative(),
    notes: z.string().optional(),
  });
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { closing_cash: 0 },
  });

  const closingCash = watch('closing_cash') ?? 0;
  const expectedCash = shift.opening_cash + shift.total_sales;
  const difference = closingCash - expectedCash;

  const onSubmit = async (values: z.infer<typeof schema>) => {
    await api.post(`/shifts/${shift.id}/close`, values);
    toast.success('Shift closed');
    await queryClient.invalidateQueries({ queryKey: ['shifts'] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Close Shift</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Opening Cash</span>
            <span className="font-medium">{formatRs(shift.opening_cash)}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-slate-500">Sales Total</span>
            <span className="font-medium">{formatRs(shift.total_sales)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-1">
            <span className="font-semibold text-slate-700">Expected Cash</span>
            <span className="font-bold">{formatRs(expectedCash)}</span>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Counted Closing Cash (Rs) *</label>
            <input type="number" step="1" {...register('closing_cash', { valueAsNumber: true })} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          {closingCash !== 0 && (
            <div className={`rounded-xl p-3 text-sm font-medium ${difference >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              Difference: {difference >= 0 ? '+' : ''}{formatRs(difference)}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea {...register('notes')} rows={2} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {isSubmitting ? 'Closing...' : 'Close Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ShiftsPage() {
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [closeShift, setCloseShift] = useState<ShiftWithDetails | null>(null);
  const queryClient = useQueryClient();

  const { data: openShifts = [], isLoading: loadingOpen } = useQuery({
    queryKey: ['shifts', 'current'],
    queryFn: () => api.get<ShiftWithDetails[]>('/shifts/current'),
    refetchInterval: 60 * 1000,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<BranchItem[]>('/branches'),
  });

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock4 className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-slate-900">Shifts</h1>
        </div>
        <button
          onClick={() => setShowOpenModal(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Open Shift
        </button>
      </div>

      {/* Open shifts */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Open Shifts</h2>
        <div className="rounded-xl bg-surface shadow-sm overflow-hidden">
          {loadingOpen ? (
            <div className="p-4 space-y-2"><LoadingSkeleton className="h-10" count={3} /></div>
          ) : openShifts.length === 0 ? (
            <EmptyState
              icon={Clock4}
              title="No open shifts"
              description="Open a shift to start recording sales"
              action={
                <button onClick={() => setShowOpenModal(true)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
                  <Plus className="h-4 w-4" /> Open Shift
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-slate-500">
                    <th className="px-4 py-3">Cashier</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Opened At</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Opening Cash</th>
                    <th className="px-4 py-3">Sales Total</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {openShifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{shift.users?.name ?? shift.cashier_id}</td>
                      <td className="px-4 py-3 text-slate-600">{shift.branches?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{format(new Date(shift.opened_at), 'dd MMM HH:mm')}</td>
                      <td className="px-4 py-3 text-slate-500">{duration(shift.opened_at)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatRs(shift.opening_cash)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatRs(shift.total_sales)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setCloseShift(shift)}
                          className="rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/20"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showOpenModal && (
        <OpenShiftModal branches={branches} onClose={() => { setShowOpenModal(false); queryClient.invalidateQueries({ queryKey: ['shifts'] }).catch(() => void 0); }} />
      )}
      {closeShift && (
        <CloseShiftModal shift={closeShift} onClose={() => setCloseShift(null)} />
      )}
    </div>
  );
}
