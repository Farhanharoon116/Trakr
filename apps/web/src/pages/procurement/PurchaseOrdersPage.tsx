import { useState, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import {
  ShoppingBag,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Truck,
  PackageCheck,
  Trash2,
  Search,
} from 'lucide-react';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useReceiveGoods,
  type PurchaseOrderFull,
} from '../../hooks/usePurchaseOrders';
import { useAllSuppliers, useCreateSupplier } from '../../hooks/useSuppliers';
import { useBranches } from '../../hooks/useBranches';
import { useProducts } from '../../hooks/useProducts';

function formatRs(n: number) {
  return `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-primary/10 text-primary',
  received: 'bg-success/10 text-success',
  cancelled: 'bg-danger/10 text-danger',
};

// ────────────────────────────────────────────────────────────────────────────
// Receive Goods Modal
// ────────────────────────────────────────────────────────────────────────────
function ReceiveGoodsModal({
  po,
  onClose,
}: {
  po: PurchaseOrderFull;
  onClose: () => void;
}) {
  const receiveGoods = useReceiveGoods();
  const [qtys, setQtys] = useState<Record<string, number>>(
    Object.fromEntries(po.purchase_order_items.map((i) => [i.id, i.qty_ordered]))
  );

  const onSubmit = async () => {
    const items = po.purchase_order_items.map((i) => ({
      item_id: i.id,
      qty_received: qtys[i.id] ?? 0,
    }));
    await receiveGoods.mutateAsync({ id: po.id, items });
    toast.success('Goods received — inventory updated');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Receive Goods — {po.po_number}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          {po.purchase_order_items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <div className="flex-1 text-sm">
                <p className="font-medium text-slate-800">{item.products?.name_en ?? 'Unknown'}</p>
                <p className="text-xs text-slate-500">Ordered: {item.qty_ordered}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Received:</label>
                <input
                  type="number"
                  min="0"
                  max={item.qty_ordered}
                  value={qtys[item.id] ?? 0}
                  onChange={(e) =>
                    setQtys((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))
                  }
                  className="w-20 rounded-lg border border-border px-2 py-1 text-sm text-center focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={receiveGoods.isPending}
            className="flex-1 rounded-xl bg-success py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {receiveGoods.isPending ? 'Saving…' : 'Confirm Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Create PO Modal
// ────────────────────────────────────────────────────────────────────────────
const createPoSchema = z.object({
  supplier_id: z.string().uuid('Select a supplier'),
  branch_id: z.string().uuid('Select a branch'),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent']),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid('Select a product'),
        qty_ordered: z.coerce.number().positive('Qty must be > 0'),
        unit_cost: z.coerce.number().nonnegative('Cost must be ≥ 0'),
      })
    )
    .min(1, 'Add at least one item'),
});

type CreatePOForm = z.infer<typeof createPoSchema>;

function useDebouncedValue(v: string, delay = 300) {
  const [val, setVal] = useState(v);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const update = (s: string) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setVal(s), delay);
  };
  return { val, update };
}

function CreatePOModal({ onClose }: { onClose: () => void }) {
  const createPO = useCreatePurchaseOrder();
  const createSupplier = useCreateSupplier();
  const { data: suppliers } = useAllSuppliers();
  const { data: branches } = useBranches();
  const { val: productSearch, update: setProductSearch } = useDebouncedValue('');
  const { products: productsData } = useProducts(productSearch || undefined);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreatePOForm>({
    resolver: zodResolver(createPoSchema),
    defaultValues: { status: 'draft', items: [{ product_id: '', qty_ordered: 1, unit_cost: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');
  const total = items.reduce((s, i) => s + (i.qty_ordered || 0) * (i.unit_cost || 0), 0);

  const onSubmit = async (values: CreatePOForm) => {
    await createPO.mutateAsync(values);
    toast.success(`Purchase order ${values.status === 'sent' ? 'sent' : 'saved as draft'}`);
    onClose();
  };

  const [newSupplierName, setNewSupplierName] = useState('');
  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    await createSupplier.mutateAsync({ name: newSupplierName.trim() });
    toast.success('Supplier added');
    setNewSupplierName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Purchase Order</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Supplier */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Supplier *</label>
            <select
              {...register('supplier_id')}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Select supplier</option>
              {(suppliers ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.supplier_id && (
              <p className="mt-1 text-xs text-danger">{errors.supplier_id.message}</p>
            )}
            {/* Inline add supplier */}
            <div className="mt-1.5 flex gap-2">
              <input
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Quick-add supplier…"
                className="flex-1 rounded-lg border border-border px-2 py-1 text-xs focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddSupplier}
                className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Branch */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Branch *</label>
            <select
              {...register('branch_id')}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Select branch</option>
              {(branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {errors.branch_id && (
              <p className="mt-1 text-xs text-danger">{errors.branch_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Expected Date</label>
              <input
                type="date"
                {...register('expected_date')}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Save as</label>
              <select
                {...register('status')}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="sent">Send Now</option>
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Items *</label>
              <div className="relative">
                <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  placeholder="Search products…"
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="rounded-lg border border-border py-1 pl-7 pr-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex items-center gap-2">
                  <select
                    {...register(`items.${idx}.product_id`)}
                    className="flex-1 rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">Select product</option>
                    {(productsData ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name_en} {p.sku ? `(${p.sku})` : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    {...register(`items.${idx}.qty_ordered`)}
                    placeholder="Qty"
                    className="w-20 rounded-xl border border-border px-2 py-2 text-sm text-center focus:border-primary focus:outline-none"
                  />
                  <input
                    type="number"
                    {...register(`items.${idx}.unit_cost`)}
                    placeholder="Cost"
                    className="w-24 rounded-xl border border-border px-2 py-2 text-sm text-center focus:border-primary focus:outline-none"
                  />
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(idx)} className="text-slate-400 hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => append({ product_id: '', qty_ordered: 1, unit_cost: 0 })}
              className="mt-2 flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add Item
            </button>
            {errors.items && (
              <p className="mt-1 text-xs text-danger">
                {typeof errors.items.message === 'string' ? errors.items.message : ''}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Total */}
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-right">
            <span className="text-sm text-slate-500">Total: </span>
            <span className="text-lg font-bold text-slate-900">{formatRs(total)}</span>
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
              {isSubmitting ? 'Saving…' : 'Create PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PO Row
// ────────────────────────────────────────────────────────────────────────────
function PORow({ po }: { po: PurchaseOrderFull }) {
  const [expanded, setExpanded] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const updatePO = useUpdatePurchaseOrder();

  const handleSend = async () => {
    await updatePO.mutateAsync({ id: po.id, status: 'sent' });
    toast.success('Purchase order sent to supplier');
  };

  const handleCancel = async () => {
    await updatePO.mutateAsync({ id: po.id, status: 'cancelled' });
    toast.success('Purchase order cancelled');
  };

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{po.po_number}</td>
        <td className="px-4 py-3 text-sm text-slate-700">{po.suppliers?.name ?? '—'}</td>
        <td className="px-4 py-3 text-sm text-slate-600">{po.branches?.name ?? '—'}</td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[po.status]}`}>
            {po.status}
          </span>
        </td>
        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
          {formatRs(po.total)}
        </td>
        <td className="px-4 py-3 text-sm text-slate-500">
          {po.expected_date ? format(parseISO(po.expected_date), 'dd MMM yyyy') : '—'}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            {po.status === 'draft' && (
              <button
                onClick={(e) => { e.stopPropagation(); void handleSend(); }}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
              >
                <Truck className="h-3.5 w-3.5" /> Send
              </button>
            )}
            {po.status === 'sent' && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowReceive(true); }}
                className="flex items-center gap-1 rounded-lg bg-success/10 px-2.5 py-1 text-xs font-medium text-success hover:bg-success/20"
              >
                <PackageCheck className="h-3.5 w-3.5" /> Receive
              </button>
            )}
            {(po.status === 'draft' || po.status === 'sent') && (
              <button
                onClick={(e) => { e.stopPropagation(); void handleCancel(); }}
                className="flex items-center gap-1 rounded-lg bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/20"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            )}
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={7} className="bg-slate-50 px-6 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500">
                  <th className="pb-1">Product</th>
                  <th className="pb-1 text-right">Ordered</th>
                  <th className="pb-1 text-right">Received</th>
                  <th className="pb-1 text-right">Unit Cost</th>
                  <th className="pb-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {po.purchase_order_items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-1.5 font-medium text-slate-800">{item.products?.name_en ?? '—'}</td>
                    <td className="py-1.5 text-right text-slate-600">{item.qty_ordered}</td>
                    <td className="py-1.5 text-right text-slate-600">{item.qty_received}</td>
                    <td className="py-1.5 text-right text-slate-600">{formatRs(item.unit_cost)}</td>
                    <td className="py-1.5 text-right font-medium text-slate-800">{formatRs(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {po.notes && (
              <p className="mt-2 text-xs text-slate-500">Notes: {po.notes}</p>
            )}
          </td>
        </tr>
      )}

      {showReceive && (
        <ReceiveGoodsModal po={po} onClose={() => setShowReceive(false)} />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────────────────
export function PurchaseOrdersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading } = usePurchaseOrders(statusFilter || undefined);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-slate-900">Purchase Orders</h1>
          {data && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {data.total}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New PO
        </button>
      </div>

      {/* Status filter */}
      <div className="mb-4 flex gap-2">
        {['', 'draft', 'sent', 'received', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSkeleton className="h-14" count={5} />
      ) : !data?.data?.length ? (
        <EmptyState
          icon={ShoppingBag}
          title="No purchase orders"
          description="Create your first PO to start tracking supplier orders"
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> New PO
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">PO #</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Supplier</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Branch</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Expected</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.data.map((po) => (
                  <PORow key={po.id} po={po} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && <CreatePOModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
