'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, User, KeyRound, AlertTriangle, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '@/utils/api';

function InvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<{ email: string; role: string } | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState('');

  const [form, setForm] = useState({ name: '', pin: '', confirmPin: '', password: '', confirmPassword: '' });
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 1. Verify invitation token validity on mount
  useEffect(() => {
    async function checkToken() {
      if (!token) {
        setVerifyError('Invitation token is missing. Please check your invitation email.');
        setVerifying(false);
        return;
      }

      try {
        const data = await apiFetch(`/auth/invitation/${token}`);
        setInvitation(data);
      } catch (err: any) {
        setVerifyError(err.message || 'Invitation is invalid, expired, or has already been used.');
      } finally {
        setVerifying(false);
      }
    }
    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');

    if (!form.name) {
      setActionError('Full Name is required.');
      return;
    }

    // 6-Digit PIN validation (required for all roles)
    if (!form.pin) {
      setActionError('A 6-digit PIN is required to unlock POS terminals.');
      return;
    }

    if (!/^\d{6}$/.test(form.pin)) {
      setActionError('PIN must contain exactly 6 numeric digits.');
      return;
    }

    if (form.pin !== form.confirmPin) {
      setActionError('PIN codes do not match.');
      return;
    }

    // Password validation (only required for Store Managers and Admins)
    const needsPassword = invitation?.role === 'STORE_MANAGER' || invitation?.role === 'SUPER_ADMIN';
    if (needsPassword) {
      if (!form.password) {
        setActionError('Store Managers require a password to access the reports dashboard.');
        return;
      }
      if (form.password.length < 6) {
        setActionError('Password must be at least 6 characters long.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setActionError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      await apiFetch('/auth/accept-invite', {
        method: 'POST',
        body: {
          token,
          name: form.name,
          pin: form.pin,
          password: needsPassword ? form.password : undefined,
        },
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit details. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-coral-500 border-t-transparent"></div>
        <p className="mt-4 text-xs font-bold text-zinc-500 dark:text-zinc-400">Verifying secure invitation token...</p>
      </div>
    );
  }

  if (verifyError) {
    return (
      <div className="text-center py-6 text-zinc-800 dark:text-zinc-100">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30 text-red-600">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-50">Invalid Invitation</h2>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto font-semibold">{verifyError}</p>
        <div className="mt-8">
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 dark:hover:bg-zinc-900 transition-colors shadow-md"
          >
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  const isManagerOrAdmin = invitation?.role === 'STORE_MANAGER' || invitation?.role === 'SUPER_ADMIN';

  return (
    <>
      <div className="mb-6 text-center text-zinc-800 dark:text-zinc-100">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-coral-50 dark:bg-coral-950/20 text-coral-500 mb-3">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Accept Invitation</h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
          Complete your profile to join the KhaoPio staff roster.
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-coral-50 dark:bg-coral-950/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-coral-700 dark:text-coral-400 border border-coral-200">
          Role: {invitation?.role.replace('_', ' ')}
        </div>
      </div>

      {actionError && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-3.5 text-xs font-bold text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {success ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-850 dark:text-zinc-100">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8 animate-bounce" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Profile Configured!</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-semibold">Your account is active. Redirecting to login...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
              Email Address
            </label>
            <input
              type="text"
              value={invitation?.email || ''}
              disabled
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-950/40 py-2.5 px-3 text-sm text-zinc-500 dark:text-zinc-450 outline-none cursor-not-allowed"
            />
          </div>

          {/* 6-Digit PIN section */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                6-Digit PIN
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
                  className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none tracking-widest transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                Confirm PIN
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={form.confirmPin}
                  onChange={(e) => setForm({ ...form, confirmPin: e.target.value.replace(/\D/g, '') })}
                  className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none tracking-widest transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500"
                  required
                />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-semibold">
            * Use this 6-digit PIN code to instantly unlock the tablet interface.
          </p>

          {/* Admin / Manager Password Fields */}
          {isManagerOrAdmin && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-4 space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-coral-500">
                Dashboard Password
              </h3>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-10 pl-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-250 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-10 pl-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-250 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full cursor-pointer rounded-lg bg-coral-500 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-coral-600 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-coral-100 dark:shadow-none"
          >
            {submitting ? 'Setting Profile...' : 'Activate Account'}
          </button>
        </form>
      )}
    </>
  );
}

export default function AcceptInvite() {
  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-950 px-4 font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      
      {/* Background Coral Glows */}
      <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-coral-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] translate-x-1/2 translate-y-1/2 rounded-full bg-amber-500/5 blur-[120px] pointer-events-none"></div>

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-2xl transition-all duration-300">
        
        {/* Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-coral-500 via-amber-500 to-yellow-400"></div>

        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-coral-500 border-t-transparent"></div>
            <p className="mt-4 text-xs font-bold text-zinc-500 dark:text-zinc-400">Loading registration context...</p>
          </div>
        }>
          <InvitationForm />
        </Suspense>
      </div>
    </div>
  );
}
