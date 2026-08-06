'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Utensils, Flame, CreditCard, BarChart2,
  ShieldAlert, CheckCircle2, Eye, EyeOff,
  ChevronRight, ChevronLeft,
} from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader } from '@/components/Loader';

const features = [
  { icon: <Utensils className="h-4 w-4" />, label: 'Dine-in & Takeaway' },
  { icon: <Flame className="h-4 w-4" />, label: 'Live Kitchen View' },
  { icon: <CreditCard className="h-4 w-4" />, label: 'UPI / Cash / Card' },
  { icon: <BarChart2 className="h-4 w-4" />, label: 'Sales Reports' },
];

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
        router.push(user.role === 'SUPER_ADMIN' ? '/dashboard' : '/billing');
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
  const [debugOtp, setDebugOtp] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      const response = await apiFetch('/auth/register-init', { method: 'POST', body: { email: form.email } });
      setDebugOtp(response.otp || '');
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

  const inputClass = "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 focus:bg-white";

  return (
    <div className="flex min-h-screen w-screen font-sans antialiased">

      {/* ── Left panel: branding ── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 relative overflow-hidden bg-zinc-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900/95 to-zinc-950 pointer-events-none" />
        <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-orange-600/8 blur-[140px] pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500">
            <Utensils className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">KhaoPio</span>
          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 tracking-widest">POS</span>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-6 max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">Restaurant Command Centre</p>
          <h2 className="text-5xl font-extrabold leading-[1.1]">
            Set up your restaurant in{' '}
            <span className="text-orange-400">minutes.</span>
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Create your admin account, verify your email, and configure your restaurant profile to get started.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 rounded-full bg-white/5 border border-white/8 px-4 py-2.5 text-sm font-medium text-zinc-300">
                <span className="text-orange-400">{f.icon}</span>
                {f.label}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-zinc-600">© {new Date().getFullYear()} KhaoPio. All rights reserved.</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex w-full lg:w-[45%] flex-col items-center justify-center px-8 py-12 overflow-y-auto"
        style={{ background: 'linear-gradient(160deg, #fde8d0 0%, #fddbb8 50%, #fce8d5 100%)' }}>

        {/* Heading */}
        <div className="w-full max-w-md mb-8">
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-2">Create account</h1>
          <p className="text-sm text-zinc-500">Get your restaurant up and running</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg shadow-orange-200/40">

          {/* Step indicator */}
          {!success && (
            <div className="flex items-center mb-8">
              {steps.map((label, i) => {
                const s = i + 1;
                const isCompleted = step > s;
                const isActive = step === s;
                return (
                  <React.Fragment key={label}>
                    <div className="flex flex-col items-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCompleted ? 'bg-orange-500 text-white' :
                        isActive ? 'bg-orange-500 text-white ring-4 ring-orange-500/20' :
                        'bg-zinc-100 text-zinc-400'
                      }`}>
                        {isCompleted ? '✓' : s}
                      </div>
                      <span className={`mt-1 text-[10px] font-medium ${isActive ? 'text-orange-500' : 'text-zinc-400'}`}>
                        {label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-[2px] mb-5 mx-2 transition-all ${step > s ? 'bg-orange-500' : 'bg-zinc-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
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
                  className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
                <input type="email" placeholder="admin@yourrestaurant.com" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className={inputClass} required />
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
                      className={inputClass} required />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-2">
                {loading ? 'Sending code...' : 'Continue'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </form>

          ) : step === 2 ? (
            /* STEP 2: OTP */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center">
                <p className="text-sm text-zinc-500">A 6-digit code was sent to</p>
                <p className="text-sm font-semibold text-zinc-900 mt-0.5">{form.email}</p>
              </div>

              {debugOtp && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-orange-500 block mb-1">Debug OTP</span>
                  <span className="text-2xl font-bold tracking-[0.5em] text-orange-600 font-mono">{debugOtp}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5 text-center">Enter verification code</label>
                <input type="text" placeholder="••••••" maxLength={6} value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                  className={`${inputClass} text-center tracking-[0.75em] font-mono text-xl`} required />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="flex items-center gap-1 px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition cursor-pointer">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 cursor-pointer">
                  {loading ? 'Verifying...' : 'Verify Code'}
                  <ChevronRight className="h-4 w-4" />
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
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 cursor-pointer">
                  {loading ? 'Creating workspace...' : 'Complete Setup'}
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {step < 3 && !success && (
          <p className="mt-6 text-sm text-zinc-600">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-orange-500 hover:text-orange-600 transition-colors">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
