'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert, CheckCircle2, Eye, EyeOff,
  ChevronRight, ChevronLeft, Check, X,
} from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { useAuthStore, setRememberMe, markJustLoggedIn } from '@/store/useAuthStore';
import { Loader } from '@/components/Loader';
import { AuthLayout, ButtonSpinner } from '@/components/AuthLayout';

const steps = ['Account', 'Verify Email', 'Restaurant'];

export default function RegisterAdmin() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = useAuthStore((state) => state.token);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (isMounted && token) {
      const user = useAuthStore.getState().user;
      if (user && user.restaurantId) {
        router.push(user.role === 'SUPER_ADMIN' ? '/dashboard' : '/orders');
      }
    }
  }, [token, router, isMounted]);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (isMounted && token) {
      const user = useAuthStore.getState().user;
      if (user && !user.restaurantId) setStep(3);
    }
  }, [token, isMounted]);

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [restaurantName, setRestaurantName] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Live password strength (1=weak, 2=good, 3=strong)
  const hasUpper = /[A-Z]/.test(form.password);
  const hasNumber = /[0-9]/.test(form.password);
  const hasSymbol = /[^A-Za-z0-9]/.test(form.password);
  const pwScore = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : hasUpper && hasNumber ? (form.password.length >= 10 && hasSymbol ? 3 : 2)
    : 1;
  const pwMeta = [
    { label: '', textColor: '', barColor: 'bg-zinc-200' },
    { label: 'Weak', textColor: 'text-red-500', barColor: 'bg-red-400' },
    { label: 'Good', textColor: 'text-amber-500', barColor: 'bg-amber-400' },
    { label: 'Strong', textColor: 'text-emerald-600', barColor: 'bg-emerald-500' },
  ][pwScore];
  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const passwordsMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/auth/register-init', { method: 'POST', body: { email: form.email } });
      setStep(2);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Error sending verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otpInput || otpInput.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch('/auth/register-verify-otp', {
        method: 'POST',
        body: { email: form.email, otp: otpInput, name: form.name, password: form.password },
      });
      setRememberMe(true);
      setAuth(response.user, response.token, response.permissions);
      setStep(3);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Incorrect code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!restaurantName.trim()) { setError('Please enter your restaurant name.'); return; }
    if (!restaurantPhone.trim()) { setError('Please enter your restaurant phone number.'); return; }
    setLoading(true);
    try {
      const response = await apiFetch('/auth/register-admin', {
        method: 'POST',
        body: {
          restaurantName: restaurantName.trim(),
          restaurantPhone: restaurantPhone.trim(),
          restaurantAddress: restaurantAddress.trim(),
        },
      });
      setAuth(response.user, response.token, response.permissions);
      setSuccess(true);
      const sidebarItems = await apiFetch('/navigation');
      useAuthStore.getState().setSidebarItems(sidebarItems);
      markJustLoggedIn();
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted || (token && useAuthStore.getState().user?.restaurantId)) {
    return <Loader size="lg" text="Verifying session..." className="h-screen w-screen bg-zinc-50" />;
  }

  const inputClass = "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 focus:bg-white";

  return (
    <AuthLayout
      pageTitle="Create account"
      pageSubtitle="Get your restaurant up and running"
    >
      {/* Step indicator */}
      {!success && (
        <ol className="flex items-center mb-8">
          {steps.map((label, i) => {
            const s = i + 1;
            const isCompleted = step > s;
            const isActive = step === s;
            return (
              <li key={label} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
                <div className="flex flex-col items-center gap-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                    isCompleted || isActive ? 'border-brand-600 bg-brand-600 text-white' : 'border-zinc-200 bg-white text-zinc-400'
                  }`}>
                    {isCompleted ? <Check className="h-4 w-4" /> : s}
                  </span>
                  <span className={`text-[11px] font-medium ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`}>
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && <span className="mx-2 mb-5 h-px flex-1 bg-zinc-200" />}
              </li>
            );
          })}
        </ol>
      )}

      {/* Error */}
      {error && (
        <div role="alert" aria-live="assertive" className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success */}
      {success ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-500">
            <CheckCircle2 className="h-8 w-8 animate-bounce" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900">You&apos;re all set!</h2>
          <p className="mt-1 text-sm text-zinc-500">Setting up your workspace...</p>
        </div>

      ) : step === 1 ? (
        /* STEP 1: Account */
        <form onSubmit={handleNextStep} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Full Name</label>
            <input type="text" placeholder="e.g. Rahul Sen" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value.replace(/[^a-zA-Z\s'\-]/g, '') })}
              autoComplete="name"
              className={inputClass} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
            <input type="email" placeholder="admin@yourrestaurant.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email" className={inputClass} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password" className={`${inputClass} pr-11`} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Confirm</label>
              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  autoComplete="new-password" className={`${inputClass} pr-11`} required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Live password strength + match feedback */}
          {form.password && (
            <div>
              <div className="flex gap-1 mb-1.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${pwScore >= i ? pwMeta.barColor : 'bg-zinc-200'}`} />
                ))}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium ${pwMeta.textColor}`}>{pwMeta.label}</span>
                {passwordsMatch && (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium"><Check className="h-3 w-3" /> Passwords match</span>
                )}
                {passwordsMismatch && (
                  <span className="flex items-center gap-1 text-red-500 font-medium"><X className="h-3 w-3" /> Doesn&apos;t match</span>
                )}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-2">
            {loading ? 'Sending code...' : 'Continue'}
            {loading ? <ButtonSpinner /> : <ChevronRight className="h-4 w-4" />}
          </button>

          <p className="text-center text-xs leading-relaxed text-zinc-500">
            By continuing you agree to the Terms of Service and Privacy Policy.
          </p>
        </form>

      ) : step === 2 ? (
        /* STEP 2: OTP */
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="text-center">
            <p className="text-sm text-zinc-500">A 6-digit code was sent to</p>
            <p className="text-sm font-semibold text-zinc-900 mt-0.5">{form.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5 text-center">Enter verification code</label>
            <input type="text" placeholder="••••••" maxLength={6} value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
              autoComplete="one-time-code"
              className={`${inputClass} text-center tracking-[0.75em] font-mono text-xl`} required />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)}
              className="flex items-center gap-1 px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition cursor-pointer">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 active:scale-[0.98] disabled:opacity-50 cursor-pointer">
              {loading ? 'Verifying...' : 'Verify Code'}
              {loading ? <ButtonSpinner /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </form>

      ) : (
        /* STEP 3: Restaurant details */
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Restaurant Name</label>
            <input type="text" placeholder="e.g. KhaoPio Restaurant" value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className={inputClass} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Phone Number</label>
            <input type="text" placeholder="+91 98765 43210" value={restaurantPhone}
              onChange={(e) => setRestaurantPhone(e.target.value.replace(/[^0-9+\-\s()]/g, ''))}
              className={inputClass} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Address <span className="text-zinc-400 font-normal">(optional)</span></label>
            <textarea placeholder="123 Main Street, City, Pin Code" value={restaurantAddress}
              onChange={(e) => setRestaurantAddress(e.target.value)} rows={3}
              className={`${inputClass} resize-none`} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(2)}
              className="flex items-center gap-1 px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition cursor-pointer">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button type="button" onClick={handleSubmit} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 active:scale-[0.98] disabled:opacity-50 cursor-pointer">
              {loading ? 'Creating workspace...' : 'Complete Setup'}
              {loading ? <ButtonSpinner /> : <CheckCircle2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {step < 3 && !success && (
        <p className="mt-6 text-center text-sm text-zinc-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors">
            Sign in
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
