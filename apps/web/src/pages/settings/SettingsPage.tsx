import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Settings } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Business } from '@bizos/shared';

// ─── Schemas ────────────────────────────────────────────────────────────────

const generalSchema = z.object({
  name: z.string().min(1, 'Required'),
  phone: z.string().max(20).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  logo_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

const taxSchema = z.object({
  tax_id: z
    .string()
    .regex(/^(\d{7}-\d|\d{5}-\d{7}-\d)$/, 'NTN format: XXXXXXX-X or CNIC format')
    .optional()
    .or(z.literal('')),
  gst_rate: z.number({ invalid_type_error: 'Must be a number' }).min(0).max(100).default(17),
  tax_enabled: z.boolean().default(true),
});

const receiptsSchema = z.object({
  receipt_header: z.string().optional().or(z.literal('')),
  receipt_footer: z.string().optional().or(z.literal('')),
  show_logo: z.boolean().default(true),
  receipt_language: z.enum(['en', 'ur', 'both']).default('en'),
});

const loyaltySchema = z.object({
  loyalty_enabled: z.boolean().default(true),
  points_per_100: z.number().min(0).default(1),
  points_per_10_discount: z.number().min(0).default(100),
});

const paymentsSchema = z.object({
  cash: z.boolean().default(true),
  card: z.boolean().default(true),
  easypaisa: z.boolean().default(true),
  jazzcash: z.boolean().default(true),
});

type GeneralForm = z.infer<typeof generalSchema>;
type TaxForm = z.infer<typeof taxSchema>;
type ReceiptsForm = z.infer<typeof receiptsSchema>;
type LoyaltyForm = z.infer<typeof loyaltySchema>;
type PaymentsForm = z.infer<typeof paymentsSchema>;

const TABS = ['General', 'Tax', 'Receipts', 'WhatsApp', 'Loyalty', 'Payments'] as const;
type Tab = (typeof TABS)[number];

// ─── Shared Save Mutation ───────────────────────────────────────────────────

function useSaveBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch<Business>('/businesses/me', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] }).catch(() => void 0);
      toast.success('Settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });
}

// ─── Tab Panels ─────────────────────────────────────────────────────────────

function GeneralTab({ business }: { business: Business }) {
  const save = useSaveBusiness();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<GeneralForm>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      name: business.name,
      phone: business.phone ?? '',
      address: business.address ?? '',
      logo_url: business.logo_url ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 max-w-lg">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Business Name *</label>
        <input {...register('name')} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
        {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
        <input {...register('phone')} placeholder="03001234567" className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
        <textarea {...register('address')} rows={2} className="input-field resize-none" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Logo URL</label>
        <input {...register('logo_url')} placeholder="https://..." className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
        {errors.logo_url && <p className="mt-1 text-xs text-danger">{errors.logo_url.message}</p>}
      </div>
      <SaveButton isSubmitting={isSubmitting} />
    </form>
  );
}

function TaxTab({ business }: { business: Business }) {
  const save = useSaveBusiness();
  const settings = business.settings as Record<string, unknown>;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TaxForm>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      tax_id: business.tax_id ?? '',
      gst_rate: (settings['gst_rate'] as number) ?? 17,
      tax_enabled: (settings['tax_enabled'] as boolean) ?? true,
    },
  });

  const onSubmit = (v: TaxForm) => {
    save.mutate({
      tax_id: v.tax_id || null,
      settings: { ...settings, gst_rate: v.gst_rate, tax_enabled: v.tax_enabled },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">NTN</label>
        <input {...register('tax_id')} placeholder="1234567-8" className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
        {errors.tax_id && <p className="mt-1 text-xs text-danger">{errors.tax_id.message}</p>}
        <p className="mt-1 text-xs text-slate-400">Format: XXXXXXX-X or CNIC XXXXX-XXXXXXX-X</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Default GST Rate (%)</label>
        <input
          type="number"
          step="0.01"
          {...register('gst_rate', { valueAsNumber: true })}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        {errors.gst_rate && <p className="mt-1 text-xs text-danger">{errors.gst_rate.message}</p>}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register('tax_enabled')} className="h-4 w-4 accent-primary" />
        Enable tax calculations
      </label>
      <SaveButton isSubmitting={isSubmitting} />
    </form>
  );
}

function ReceiptsTab({ business }: { business: Business }) {
  const save = useSaveBusiness();
  const settings = business.settings as Record<string, unknown>;
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ReceiptsForm>({
    resolver: zodResolver(receiptsSchema),
    defaultValues: {
      receipt_header: (settings['receipt_header'] as string) ?? '',
      receipt_footer: (settings['receipt_footer'] as string) ?? '',
      show_logo: (settings['show_logo'] as boolean) ?? true,
      receipt_language: ((settings['receipt_language'] as 'en' | 'ur' | 'both') ?? 'en'),
    },
  });

  const onSubmit = (v: ReceiptsForm) => {
    save.mutate({ settings: { ...settings, ...v } });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Receipt Header Text</label>
        <input {...register('receipt_header')} placeholder="Welcome to our store" className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Receipt Footer Text</label>
        <input {...register('receipt_footer')} placeholder="Thank you for your business!" className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register('show_logo')} className="h-4 w-4 accent-primary" />
        Show logo on receipt
      </label>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Language</label>
        <select {...register('receipt_language')} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
          <option value="en">English</option>
          <option value="ur">Urdu</option>
          <option value="both">Both</option>
        </select>
      </div>
      <SaveButton isSubmitting={isSubmitting} />
    </form>
  );
}

function WhatsAppTab() {
  return (
    <div className="max-w-lg space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Interakt API Key
        </label>
        <input
          type="password"
          placeholder="Enter your Interakt API key"
          className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          disabled
        />
        <p className="mt-1 text-xs text-slate-400">
          API key configuration requires backend setup.
        </p>
      </div>
      <button
        type="button"
        onClick={() => toast('Feature requires backend configuration', { icon: 'ℹ️' })}
        className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Test Connection
      </button>
    </div>
  );
}

function LoyaltyTab({ business }: { business: Business }) {
  const save = useSaveBusiness();
  const settings = business.settings as Record<string, unknown>;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoyaltyForm>({
    resolver: zodResolver(loyaltySchema),
    defaultValues: {
      loyalty_enabled: (settings['loyalty_enabled'] as boolean) ?? true,
      points_per_100: (settings['points_per_100'] as number) ?? 1,
      points_per_10_discount: (settings['points_per_10_discount'] as number) ?? 100,
    },
  });

  const onSubmit = (v: LoyaltyForm) => {
    save.mutate({ settings: { ...settings, ...v } });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register('loyalty_enabled')} className="h-4 w-4 accent-primary" />
        Enable loyalty program
      </label>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Points earned per Rs 100 spent</label>
        <input
          type="number"
          step="1"
          min="0"
          {...register('points_per_100', { valueAsNumber: true })}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        {errors.points_per_100 && <p className="mt-1 text-xs text-danger">{errors.points_per_100.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Points needed for Rs 10 discount</label>
        <input
          type="number"
          step="1"
          min="0"
          {...register('points_per_10_discount', { valueAsNumber: true })}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        {errors.points_per_10_discount && (
          <p className="mt-1 text-xs text-danger">{errors.points_per_10_discount.message}</p>
        )}
      </div>
      <SaveButton isSubmitting={isSubmitting} />
    </form>
  );
}

function PaymentsTab({ business }: { business: Business }) {
  const save = useSaveBusiness();
  const settings = business.settings as Record<string, unknown>;
  const enabledPayments = (settings['enabled_payments'] as string[]) ?? ['cash', 'card', 'easypaisa', 'jazzcash'];

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<PaymentsForm>({
    resolver: zodResolver(paymentsSchema),
    defaultValues: {
      cash: enabledPayments.includes('cash'),
      card: enabledPayments.includes('card'),
      easypaisa: enabledPayments.includes('easypaisa'),
      jazzcash: enabledPayments.includes('jazzcash'),
    },
  });

  const onSubmit = (v: PaymentsForm) => {
    const enabled = Object.entries(v)
      .filter(([, enabled]) => enabled)
      .map(([method]) => method);
    save.mutate({ settings: { ...settings, enabled_payments: enabled } });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 max-w-lg">
      <p className="text-sm text-slate-500 mb-3">Enable or disable payment methods at checkout.</p>
      {(['cash', 'card', 'easypaisa', 'jazzcash'] as const).map((method) => (
        <label key={method} className="flex items-center gap-2 text-sm capitalize">
          <input type="checkbox" {...register(method)} className="h-4 w-4 accent-primary" />
          {method.charAt(0).toUpperCase() + method.slice(1)}
        </label>
      ))}
      <SaveButton isSubmitting={isSubmitting} />
    </form>
  );
}

function SaveButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-primary-700"
    >
      {isSubmitting ? 'Saving...' : 'Save'}
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('General');

  const { data: business, isLoading } = useQuery({
    queryKey: ['business'],
    queryFn: () => api.get<Business>('/businesses/me'),
    staleTime: 60 * 1000,
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4 max-w-lg">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : !business ? (
        <p className="text-sm text-danger">Failed to load settings</p>
      ) : (
        <div>
          {activeTab === 'General' && <GeneralTab business={business} />}
          {activeTab === 'Tax' && <TaxTab business={business} />}
          {activeTab === 'Receipts' && <ReceiptsTab business={business} />}
          {activeTab === 'WhatsApp' && <WhatsAppTab />}
          {activeTab === 'Loyalty' && <LoyaltyTab business={business} />}
          {activeTab === 'Payments' && <PaymentsTab business={business} />}
        </div>
      )}
    </div>
  );
}

// Inline CSS class helper — add to tailwind config or use inline approach
const _inputFieldClass = 'w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none';
void _inputFieldClass;
