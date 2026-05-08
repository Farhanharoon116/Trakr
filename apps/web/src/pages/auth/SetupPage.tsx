import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';

const BASE_URL = import.meta.env['VITE_API_URL'] as string ?? 'http://localhost:3001';

const step1Schema = z.object({
  business_name: z.string().min(1, 'Business name is required').max(255),
  phone: z.string().regex(/^\+92[0-9]{10}$/, 'Format: +92XXXXXXXXXX'),
});

type Step1Form = z.infer<typeof step1Schema>;

export function SetupPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<Step1Form>({ resolver: zodResolver(step1Schema) });

  const handleSetup = async (data: Step1Form) => {
    const setupToken = sessionStorage.getItem('setup_token') ?? '';
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/setup-business`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${setupToken}`,
        },
        body: JSON.stringify({ ...data, plan: 'starter' }),
      });
      const body = await res.json() as {
        access_token?: string;
        refresh_token?: string;
        user?: unknown;
        business?: unknown;
        error?: string;
      };
      if (!res.ok) {
        toast.error(body.error ?? 'Setup failed');
        return;
      }
      setAuth({
        user: body.user as Parameters<typeof setAuth>[0]['user'],
        business: body.business as Parameters<typeof setAuth>[0]['business'],
        accessToken: body.access_token!,
        refreshToken: body.refresh_token!,
      });
      sessionStorage.removeItem('setup_token');
      navigate('/pos');
      toast.success('Welcome to BizOS!');
    } catch {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Set up your business</h1>
          <p className="mt-1 text-sm text-slate-500">Step {currentStep} of 3</p>
        </div>

        {/* Progress dots */}
        <div className="mb-8 flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full transition-colors ${
                s <= currentStep ? 'bg-primary' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          {currentStep === 1 && (
            <form onSubmit={form.handleSubmit(handleSetup)} className="space-y-4">
              <h2 className="font-semibold text-slate-900">Business Info</h2>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Business Name *
                </label>
                <input
                  {...form.register('business_name')}
                  type="text"
                  placeholder="My Shop"
                  dir="auto"
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                />
                {form.formState.errors.business_name && (
                  <p className="mt-1 text-xs text-danger">
                    {form.formState.errors.business_name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Phone Number *
                </label>
                <input
                  {...form.register('phone')}
                  type="tel"
                  placeholder="+92XXXXXXXXXX"
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
                />
                {form.formState.errors.phone && (
                  <p className="mt-1 text-xs text-danger">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isLoading ? 'Setting up...' : 'Create Business'}
              </button>
            </form>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-900">Branch Details</h2>
              <p className="text-sm text-slate-500">A "Main Branch" has been created.</p>
              <button
                onClick={() => setCurrentStep(3)}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white"
              >
                Continue
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-900">Add Products</h2>
              <p className="text-sm text-slate-500">
                You can add products later from the Products page.
              </p>
              <button
                onClick={() => navigate('/pos')}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white"
              >
                Go to POS
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
