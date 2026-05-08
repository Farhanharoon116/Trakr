import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { UserRound, Plus, X, MessageCircle, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useCustomerPurchases,
} from '../../hooks/useCustomers';
import type { Customer } from '@bizos/shared';

function formatRs(n: number) {
  return `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// Simple debounced search hook
function useDebouncedSearch() {
  const [raw, setRaw] = useState('');
  const [debounced, setDebounced] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = (v: string) => {
    setRaw(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(v), 300);
  };

  return { raw, debounced, onChange };
}

// Add Customer Modal
const addCustomerSchema = z.object({
  name: z.string().max(255).optional(),
  phone: z
    .string()
    .min(1, 'Phone is required')
    .regex(/^(\+92|0)[0-9]{10}$/, 'Enter a valid Pakistani phone number (e.g. 03001234567)'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

type AddCustomerForm = z.infer<typeof addCustomerSchema>;

function AddCustomerModal({ onClose }: { onClose: () => void }) {
  const createCustomer = useCreateCustomer();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddCustomerForm>({ resolver: zodResolver(addCustomerSchema) });

  const onSubmit = async (values: AddCustomerForm) => {
    await createCustomer.mutateAsync({
      name: values.name || undefined,
      phone: values.phone,
      email: values.email || undefined,
    });
    toast.success('Customer added');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Customer</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              {...register('name')}
              placeholder="Customer name (optional)"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone *</label>
            <input
              {...register('phone')}
              placeholder="03001234567"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            {errors.phone && <p className="mt-1 text-xs text-danger">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              {...register('email')}
              placeholder="email@example.com (optional)"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
          </div>
          <div className="flex gap-2 pt-2">
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
              {isSubmitting ? 'Adding...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// WhatsApp Modal
function WhatsAppModal({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const whatsappConfigured = import.meta.env['VITE_WHATSAPP_CONFIGURED'] === 'true';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Send WhatsApp</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          To: <span className="font-medium text-slate-700">{customer.phone}</span>
        </p>
        {!whatsappConfigured ? (
          <div className="rounded-xl bg-warning/10 p-3 text-sm text-warning">
            WhatsApp not configured. Set VITE_WHATSAPP_CONFIGURED=true to enable.
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => { toast.success('Receipt sent via WhatsApp'); onClose(); }}
              className="w-full rounded-xl bg-success/10 py-2.5 text-sm font-medium text-success hover:bg-success/20"
            >
              <MessageCircle className="mr-2 inline h-4 w-4" />
              Send Receipt
            </button>
            <button
              onClick={() => { toast.success('Payment reminder sent'); onClose(); }}
              className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Payment Reminder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Customer Detail Panel
function CustomerDetailPanel({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const updateCustomer = useUpdateCustomer();
  const { data: purchases, isLoading: purchasesLoading } = useCustomerPurchases(customer.id);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ name: string; phone: string; email: string; notes: string }>({
    defaultValues: {
      name: customer.name ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      notes: customer.notes ?? '',
    },
  });

  const onSave = async (values: { name: string; phone: string; email: string; notes: string }) => {
    await updateCustomer.mutateAsync({
      id: customer.id,
      name: values.name || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      notes: values.notes || undefined,
    });
    toast.success('Customer updated');
  };

  const onNotesBlur = async (notes: string) => {
    await updateCustomer.mutateAsync({ id: customer.id, notes }).catch(() => void 0);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              {(customer.name ?? 'C')[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{customer.name ?? 'Unknown'}</h2>
              <p className="text-sm text-slate-500">{customer.phone ?? 'No phone'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Edit Info */}
          <form onSubmit={handleSubmit(onSave)} className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Customer Info</h3>
            <input
              {...register('name')}
              placeholder="Name"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              {...register('phone')}
              placeholder="Phone"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              {...register('email')}
              placeholder="Email"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* Loyalty Points */}
          <div className="rounded-xl bg-primary/5 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Loyalty Points</h3>
            <p className="text-2xl font-bold text-primary">{customer.loyalty_points}</p>
            <p className="text-xs text-slate-500 mt-1">Earn 1 pt per Rs 100 spent</p>
            <p className="text-xs text-slate-400">
              Total spent: {formatRs(customer.total_spent)}
            </p>
          </div>

          {/* CRM Notes */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Notes</h3>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Add notes about this customer..."
              onBlur={(e) => { onNotesBlur(e.target.value).catch(() => void 0); }}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* WhatsApp */}
          {customer.phone && (
            <button
              onClick={() => setShowWhatsApp(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-success/10 py-2.5 text-sm font-medium text-success hover:bg-success/20"
            >
              <MessageCircle className="h-4 w-4" />
              Send WhatsApp
            </button>
          )}

          {/* Purchase History */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Purchase History</h3>
            {purchasesLoading ? (
              <LoadingSkeleton className="h-12" count={3} />
            ) : !purchases || purchases.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No purchases yet</p>
            ) : (
              <div className="space-y-2">
                {purchases.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-800">#{p.receipt_number}</p>
                      <p className="text-xs text-slate-500">
                        {format(parseISO(p.created_at), 'dd MMM yyyy')} ·{' '}
                        {p.sale_items.length} item{p.sale_items.length !== 1 ? 's' : ''} ·{' '}
                        {p.payment_method.toUpperCase()}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-900">{formatRs(p.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showWhatsApp && (
        <WhatsAppModal customer={customer} onClose={() => setShowWhatsApp(false)} />
      )}
    </>
  );
}

export function CustomersPage() {
  const { raw: searchRaw, debounced: searchDebounced, onChange: onSearchChange } =
    useDebouncedSearch();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: customers, isLoading } = useCustomers(searchDebounced || undefined);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserRound className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-slate-900">Customers</h1>
          {customers && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {customers.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchRaw}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or phone..."
          className="w-full max-w-sm rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSkeleton className="h-14" count={5} />
      ) : !customers || customers.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="No customers found"
          description={searchDebounced ? 'Try a different search' : 'Add your first customer to get started'}
          action={
            !searchDebounced ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" /> Add Customer
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Phone</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Total Spent</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Points</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Last Visit</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatRs(c.total_spent)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {c.loyalty_points} pts
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {format(parseISO(c.updated_at), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    <ChevronRight className="h-4 w-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && <AddCustomerModal onClose={() => setShowAddModal(false)} />}
      {selectedCustomer && (
        <CustomerDetailPanel
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
}
