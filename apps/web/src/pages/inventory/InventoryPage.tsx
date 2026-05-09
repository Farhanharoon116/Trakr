import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Layers, AlertTriangle, Package } from 'lucide-react';
import { api } from '../../lib/api';
import { useInventory } from '../../hooks/useInventory';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import type { Inventory, Product } from '@bizos/shared';

type Tab = 'stock' | 'adjust' | 'low-stock';

interface InventoryWithDetails extends Inventory {
  products?: { name_en: string; sku: string | null; image_url: string | null };
  branches?: { name: string };
}

function stockRowColor(qty: number, reorder: number): string {
  if (qty < reorder) return 'bg-danger/5';
  if (qty < reorder * 1.2) return 'bg-warning/5';
  return '';
}

const adjustSchema = z.object({
  product_id: z.string().uuid('Select a product'),
  branch_id: z.string().uuid('Select a branch'),
  qty_change: z.number({ invalid_type_error: 'Required' }).refine((n) => n !== 0, 'Cannot be 0'),
  reason: z.string().min(1, 'Select a reason'),
});

type AdjustForm = z.infer<typeof adjustSchema>;

const REASONS = [
  'Received from supplier',
  'Damaged',
  'Counted (stocktake)',
  'Theft',
  'Other',
];

interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

interface BranchesResponse {
  id: string;
  name: string;
}

export function InventoryPage() {
  const [tab, setTab] = useState<Tab>('stock');
  const queryClient = useQueryClient();

  const { data: inventory = [], isLoading } = useInventory() as {
    data: InventoryWithDetails[] | undefined;
    isLoading: boolean;
  };

  const { data: productsData } = useQuery({
    queryKey: ['products', '', '', 'active'],
    queryFn: () => api.get<ProductsResponse>('/products?limit=200&is_active=true'),
  });
  const products = productsData?.data ?? [];

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<BranchesResponse[]>('/branches'),
  });

  const lowStock = (inventory as InventoryWithDetails[]).filter((i) => i.qty_on_hand < i.reorder_point);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustForm>({ resolver: zodResolver(adjustSchema) });

  const adjustMutation = useMutation({
    mutationFn: (body: AdjustForm) => api.post('/inventory/adjust', body),
    onSuccess: () => {
      toast.success('Stock adjusted');
      reset();
      queryClient.invalidateQueries({ queryKey: ['inventory'] }).catch(() => void 0);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'stock', label: 'Stock Levels' },
    { id: 'adjust', label: 'Adjustments' },
    { id: 'low-stock', label: 'Low Stock', badge: lowStock.length },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Layers className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-slate-900">Inventory</h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-0 overflow-hidden rounded-xl border border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${tab === t.id ? 'bg-white/20 text-white' : 'bg-danger/10 text-danger'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Stock Levels */}
      {tab === 'stock' && (
        <div className="rounded-xl bg-surface shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-2"><LoadingSkeleton className="h-10" count={5} /></div>
          ) : inventory.length === 0 ? (
            <EmptyState icon={Package} title="No inventory records" description="Add products and track inventory to see stock levels here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-slate-500">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">In Stock</th>
                    <th className="px-4 py-3">Reorder At</th>
                    <th className="px-4 py-3">Reorder Qty</th>
                    <th className="px-4 py-3">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(inventory as InventoryWithDetails[]).map((item) => (
                    <tr key={item.id} className={stockRowColor(item.qty_on_hand, item.reorder_point)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-slate-300 flex-shrink-0" />
                          <span className="font-medium text-slate-900">{item.products?.name_en ?? item.product_id}</span>
                          {item.products?.sku && <span className="font-mono text-xs text-slate-400">{item.products.sku}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.branches?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${item.qty_on_hand < item.reorder_point ? 'text-danger' : item.qty_on_hand < item.reorder_point * 1.2 ? 'text-warning' : 'text-success'}`}>
                          {item.qty_on_hand}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{item.reorder_point}</td>
                      <td className="px-4 py-3 text-slate-500">{item.reorder_qty}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{new Date(item.updated_at).toLocaleDateString('en-PK')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Adjustments */}
      {tab === 'adjust' && (
        <div className="max-w-md rounded-xl bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Manual Stock Adjustment</h2>
          <form onSubmit={handleSubmit((v) => adjustMutation.mutate(v))} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Product *</label>
              <select {...register('product_id')} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
                <option value="">-- Select product --</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name_en}</option>)}
              </select>
              {errors.product_id && <p className="mt-1 text-xs text-danger">{errors.product_id.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Branch *</label>
              <select {...register('branch_id')} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
                <option value="">-- Select branch --</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {errors.branch_id && <p className="mt-1 text-xs text-danger">{errors.branch_id.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Quantity Change *</label>
              <p className="mb-1 text-xs text-slate-500">Use positive to add, negative to subtract (e.g. -5)</p>
              <input type="number" {...register('qty_change', { valueAsNumber: true })} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="e.g. +10 or -3" />
              {errors.qty_change && <p className="mt-1 text-xs text-danger">{errors.qty_change.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Reason *</label>
              <select {...register('reason')} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
                <option value="">-- Select reason --</option>
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {errors.reason && <p className="mt-1 text-xs text-danger">{errors.reason.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting || adjustMutation.isPending} className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {adjustMutation.isPending ? 'Adjusting...' : 'Apply Adjustment'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Low Stock Report */}
      {tab === 'low-stock' && (
        <div className="rounded-xl bg-surface shadow-sm overflow-hidden">
          {lowStock.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="All stock levels are healthy" description="No products are below their reorder point." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-slate-500">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Current Stock</th>
                    <th className="px-4 py-3">Reorder Point</th>
                    <th className="px-4 py-3">Shortage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lowStock.sort((a, b) => (a.qty_on_hand - a.reorder_point) - (b.qty_on_hand - b.reorder_point)).map((item) => (
                    <tr key={item.id} className="bg-danger/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-danger flex-shrink-0" />
                          <span className="font-medium text-slate-900">{item.products?.name_en ?? item.product_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.branches?.name ?? '—'}</td>
                      <td className="px-4 py-3 font-bold text-danger">{item.qty_on_hand}</td>
                      <td className="px-4 py-3 text-slate-500">{item.reorder_point}</td>
                      <td className="px-4 py-3 font-medium text-danger">{item.reorder_point - item.qty_on_hand}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
