import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';

const BASE_URL = import.meta.env['VITE_API_URL'] as string ?? 'http://localhost:3001';

const phoneSchema = z.object({
  phone: z
    .string()
    .regex(/^\+92[0-9]{10}$/, 'Format: +92XXXXXXXXXX'),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'Enter 6-digit OTP'),
});

type PhoneForm = z.infer<typeof phoneSchema>;
type OTPForm = z.infer<typeof otpSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const phoneForm = useForm<PhoneForm>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<OTPForm>({ resolver: zodResolver(otpSchema) });

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('92')) return `+${digits}`;
    if (digits.startsWith('0')) return `+92${digits.slice(1)}`;
    if (digits.length === 10) return `+92${digits}`;
    return raw;
  };

  const handleSendOTP = async (data: PhoneForm) => {
    setIsLoading(true);
    try {
      const formatted = formatPhone(data.phone);
      const res = await fetch(`${BASE_URL}/api/v1/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatted }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        toast.error(err.error);
        return;
      }
      setPhone(formatted);
      setStep('otp');
      toast.success('OTP sent!');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (data: OTPForm) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: data.otp }),
      });
      const body = (await res.json()) as {
        new_user?: boolean;
        setup_token?: string;
        access_token?: string;
        refresh_token?: string;
        user?: unknown;
        business?: unknown;
      };

      if (!res.ok) {
        toast.error((body as { error: string }).error ?? 'Invalid OTP');
        return;
      }

      if (body.new_user) {
        sessionStorage.setItem('setup_token', body.setup_token ?? '');
        navigate('/setup');
        return;
      }

      setAuth({
        user: body.user as Parameters<typeof setAuth>[0]['user'],
        business: body.business as Parameters<typeof setAuth>[0]['business'],
        accessToken: body.access_token!,
        refreshToken: body.refresh_token!,
      });
      navigate('/pos');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">BizOS</h1>
          <p className="mt-1 text-sm text-slate-500">Business Operating System</p>
        </div>

        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          {step === 'phone' ? (
            <form onSubmit={phoneForm.handleSubmit(handleSendOTP)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Phone Number
                </label>
                <input
                  {...phoneForm.register('phone')}
                  type="tel"
                  placeholder="+92XXXXXXXXXX"
                  dir="ltr"
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {phoneForm.formState.errors.phone && (
                  <p className="mt-1 text-xs text-danger">
                    {phoneForm.formState.errors.phone.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Get OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={otpForm.handleSubmit(handleVerifyOTP)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Enter OTP sent to {phone}
                </label>
                <input
                  {...otpForm.register('otp')}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  dir="ltr"
                  autoFocus
                  className="w-full rounded-xl border border-border px-4 py-3 text-center text-2xl tracking-widest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    otpForm.setValue('otp', val);
                    if (val.length === 6) {
                      otpForm.handleSubmit(handleVerifyOTP)();
                    }
                  }}
                />
                {otpForm.formState.errors.otp && (
                  <p className="mt-1 text-xs text-danger">
                    {otpForm.formState.errors.otp.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-sm text-slate-500 underline"
              >
                Change number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
