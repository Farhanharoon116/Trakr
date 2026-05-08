import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { GitBranch, BarChart3, Package, ArrowRightLeft } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useBranchComparison, useInventoryTransfer } from '../../hooks/useBranchComparison';
import { useBranches } from '../../hooks/useBranches';
import { useProducts } from '../../hooks/useProducts';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';

function formatRs(n: number) {
  return `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

const transferSchema = z.object({
  product_id: z.string().uuid('Select a product'),
  from_branch_id: z.string().uuid('Select source branch'),
  to_branch_id: z.string().uuid('Select destination branch'),
  qty: z.coerce.number().positive('Qty must be > 0'),
  reason: z.string().optional(),
});

type TransferForm = z.infer<typeof transferSchema>;

function TransferModal({ onClose }: { onClose: () => void }) {
  const transfer = useInventoryTransfer();
  const { data: branches } = useBranches();
  const { products } = useProducts();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TransferForm>({ resolver: zodResolver(transferSchema) });

  const onSubmit = async (values: TransferForm) => {
    if (values.from_branch_id === values.to_branch_id) {
      toast.error('Source and destination must differ');
      return;
    }
    await transfer.mutateAsync(values);
    toast.success('Stock transferred successfully');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Inter-Branch Transfer</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Product *</label>
            <select
              {...register('product_id')}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name_en}</option>
              ))}
            </select>
            {errors.product_id && (
              <p className="mt-1 text-xs text-danger">{errors.product_id.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">From Branch *</label>
              <select
                {...register('from_branch_id')}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Select</option>
                {(branches ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {errors.from_branch_id && (
                <p className="mt-1 text-xs text-danger">{errors.from_branch_id.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">To Branch *</label>
              <select
                {...register('to_branch_id')}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Select</option>
                {(branches ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {errors.to_branch_id && (
                <p className="mt-1 text-xs text-danger">{errors.to_branch_id.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Quantity *</label>
            <input
              type="number"
              {...register('qty')}
              placeholder="0"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            {errors.qty && <p className="mt-1 text-xs text-danger">{errors.qty.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Reason</label>
            <input
              {...register('reason')}
              placeholder="Reason for transfer"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSubmitting ? 'Transferring…' : 'Transfer Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ConsolidatedReportsPage() {
  const { data, isLoading } = useBranchComparison();
  const [showTransfer, setShowTransfer] = useState(false);

  // Collect branch names for chart colors
  const branchNames = (data?.revenue_totals ?? []).map((b) => b.branch_name);
  const COLORS = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED'];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Multi-Branch Reports</h1>
            <p className="text-sm text-slate-500">Last 30 days — all branches</p>
          </div>
        </div>
        <button
          onClick={() => setShowTransfer(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
        >
          <ArrowRightLeft className="h-4 w-4" />
          Transfer Stock
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-64" />
          <LoadingSkeleton className="h-48" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Revenue totals */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.revenue_totals ?? []).map((b, i) => (
              <div key={b.branch_id} className="rounded-xl bg-surface p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <p className="text-sm font-medium text-slate-600">{b.branch_name}</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatRs(b.total_revenue)}</p>
                <p className="mt-1 text-xs text-slate-400">Last 30 days revenue</p>
              </div>
            ))}
          </div>

          {/* Revenue chart */}
          <div className="rounded-xl bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-slate-700">Revenue by Branch (Last 30 Days)</h2>
            </div>
            {(data?.revenue_chart ?? []).length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data?.revenue_chart ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(d: string) => d.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(v: number) => [formatRs(v)]} />
                  <Legend />
                  {branchNames.map((name, i) => (
                    <Bar
                      key={name}
                      dataKey={name}
                      fill={COLORS[i % COLORS.length]}
                      radius={[3, 3, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Inventory comparison */}
          <div className="rounded-xl bg-surface shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <Package className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-700">Inventory Comparison</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Branch</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Total SKUs</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Low Stock</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.inventory_comparison ?? []).map((b) => {
                    const lowPct = b.total_skus ? Math.round((b.low_stock_count / b.total_skus) * 100) : 0;
                    return (
                      <tr key={b.branch_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{b.branch_name}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{b.total_skus}</td>
                        <td className="px-4 py-3 text-right">
                          {b.low_stock_count > 0 ? (
                            <span className="font-semibold text-danger">{b.low_stock_count}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${lowPct > 30 ? 'bg-danger' : lowPct > 10 ? 'bg-warning' : 'bg-success'}`}
                                style={{ width: `${Math.min(100, 100 - lowPct)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${lowPct > 30 ? 'text-danger' : lowPct > 10 ? 'text-warning' : 'text-success'}`}>
                              {100 - lowPct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showTransfer && <TransferModal onClose={() => setShowTransfer(false)} />}
    </div>
  );
}
