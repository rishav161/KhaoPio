'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Utensils, Flame, CreditCard, BarChart2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader } from '@/components/Loader';

export default function Login() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setSidebarItems = useAuthStore((state) => state.setSidebarItems);
  const token = useAuthStore((state) => state.token);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);



  // If already authenticated, redirect to starting dashboard/billing immediately
  useEffect(() => {
    if (isMounted && token) {
      const user = useAuthStore.getState().user;
      if (user && !user.restaurantId) {
        router.push('/register-admin');
      } else if (user?.role === 'SUPER_ADMIN') {
        router.push('/dashboard');
      } else {
        router.push('/billing');
      }
    }
  }, [token, router, isMounted]);

  // Tab state: 'pin' (staff email + PIN quick login) or 'email' (admin password login)
  const [tab, setTab] = useState<'pin' | 'email'>('email');

  // Staff PIN login states
  const [staffEmail, setStaffEmail] = useState('');
  const [pin, setPin] = useState('');
  const [staffError, setStaffError] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Admin email/password login states
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [emailError, setEmailError] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password states
  const [forgotStep, setForgotStep] = useState<'idle' | 'email' | 'otp'> ('idle');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotShowPassword, setForgotShowPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDebugOtp, setForgotDebugOtp] = useState('');

  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail) { setForgotError('Please enter your email.'); return; }
    setForgotLoading(true);
    try {
      const res = await apiFetch('/auth/forgot-password', { method: 'POST', body: { email: forgotEmail } });
      setForgotDebugOtp(res.otp || '');
      setForgotStep('otp');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to send reset code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotOtp || forgotOtp.length !== 6) { setForgotError('Enter the 6-digit code.'); return; }
    if (!forgotNewPassword || forgotNewPassword.length < 6) { setForgotError('Password must be at least 6 characters.'); return; }
    setForgotLoading(true);
    try {
      await apiFetch('/auth/reset-password', { method: 'POST', body: { email: forgotEmail, otp: forgotOtp, newPassword: forgotNewPassword } });
      setForgotStep('idle');
      setForgotEmail(''); setForgotOtp(''); setForgotNewPassword(''); setForgotDebugOtp('');
      setEmailForm({ ...emailForm, email: forgotEmail });
      setEmailError('Password reset successfully. Please sign in.');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Clear errors and input fields when changing tabs
  const handleTabChange = (targetTab: 'pin' | 'email') => {
    setTab(targetTab);
    setPin('');
    setStaffError('');
    setEmailError('');
  };

  // 1. Handle Admin Email/Password login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    if (!emailForm.email || !emailForm.password) {
      setEmailError('Please enter both email and password.');
      return;
    }

    setLoadingEmail(true);
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: emailForm,
      });

      // Save session credentials
      setAuth(response.user, response.token, response.permissions);

      // Fetch dynamic sidebar configuration
      const sidebarItems = await apiFetch('/navigation');
      setSidebarItems(sidebarItems);

      // Redirect
      if (!response.user.restaurantId) {
        router.push('/register-admin');
      } else if (response.user.role === 'SUPER_ADMIN') {
        router.push('/dashboard');
      } else {
        router.push('/billing');
      }
    } catch (err: any) {
      setEmailError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoadingEmail(false);
    }
  };

  // 2. Handle Keypad PIN entries
  const handleKeyPress = (num: string) => {
    if (!staffEmail) {
      setStaffError('Please enter your staff email first.');
      return;
    }
    setStaffError('');
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  // 3. Trigger PIN Login when 6 digits are completed
  useEffect(() => {
    if (pin.length === 6 && staffEmail) {
      const submitPinLogin = async () => {
        setLoadingStaff(true);
        setStaffError('');
        try {
          const response = await apiFetch('/auth/pin-login', {
            method: 'POST',
            body: {
              email: staffEmail,
              pin,
            },
          });

          // Save session credentials
          setAuth(response.user, response.token, response.permissions);

          // Fetch dynamic sidebar configuration
          const sidebarItems = await apiFetch('/navigation');
          setSidebarItems(sidebarItems);

          // Determine starting page based on role/permissions
          const startPath = response.user.role === 'SUPER_ADMIN' ? '/dashboard' : (sidebarItems.length > 0 ? sidebarItems[0].path : '/billing');
          router.push(startPath);
        } catch (err: any) {
          setStaffError(err.message || 'Invalid email or PIN.');
          setPin(''); // Reset pin input on error
        } finally {
          setLoadingStaff(false);
        }
      };
      submitPinLogin();
    }
  }, [pin, staffEmail, router, setAuth, setSidebarItems]);

  if (!isMounted || token) {
    return (
      <Loader
        size="lg"
        text="Verifying session..."
        className="h-screen w-screen bg-zinc-50 dark:bg-zinc-950"
      />
    );
  }

  const features = [
    { icon: <Utensils className="h-4 w-4" />, label: 'Dine-in & Takeaway' },
    { icon: <Flame className="h-4 w-4" />, label: 'Live Kitchen View' },
    { icon: <CreditCard className="h-4 w-4" />, label: 'UPI / Cash / Card' },
    { icon: <BarChart2 className="h-4 w-4" />, label: 'Sales Reports' },
  ];

  return (
    <div className="flex min-h-screen w-screen font-sans antialiased">

      {/* ── Left panel: branding ── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 relative overflow-hidden bg-zinc-950 text-white">
        {/* dark restaurant atmosphere overlay */}
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
            Every order, every table, every bill —{' '}
            <span className="text-orange-400">in one place.</span>
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Manage your menu, kitchen, staff and payments from a single fast POS built for Indian restaurants.
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

      {/* ── Right panel: login form ── */}
      <div className="flex w-full lg:w-[45%] flex-col items-center justify-center px-8 py-12" style={{ background: 'linear-gradient(160deg, #fde8d0 0%, #fddbb8 50%, #fce8d5 100%)' }}>

        {/* Heading outside card */}
        <div className="w-full max-w-md mb-8">
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-2">Welcome back</h1>
          <p className="text-sm text-zinc-500">Sign in to your KhaoPio account</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg shadow-orange-200/40">

          {/* ── Forgot password panel ── */}
          {forgotStep !== 'idle' ? (
            <div>
              <button onClick={() => { setForgotStep('idle'); setForgotError(''); }}
                className="mb-5 text-sm text-zinc-500 hover:text-zinc-700 transition cursor-pointer">
                ← Back to sign in
              </button>
              <h2 className="text-lg font-bold text-zinc-900 mb-1">Reset your password</h2>
              <p className="text-sm text-zinc-500 mb-6">
                {forgotStep === 'email' ? "Enter your email and we'll send a reset code." : `Code sent to ${forgotEmail}. Enter it below with your new password.`}
              </p>
              {forgotError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" /><span>{forgotError}</span>
                </div>
              )}
              {forgotStep === 'email' ? (
                <form onSubmit={handleForgotSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
                    <input type="email" placeholder="admin@yourrestaurant.com" value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 focus:bg-white"
                      required />
                  </div>
                  <button type="submit" disabled={forgotLoading}
                    className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 cursor-pointer">
                    {forgotLoading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotReset} className="space-y-4">
                  {forgotDebugOtp && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-center">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-orange-500 block mb-1">Debug OTP</span>
                      <span className="text-2xl font-bold tracking-[0.5em] text-orange-600 font-mono">{forgotDebugOtp}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Verification Code</label>
                    <input type="text" placeholder="••••••" maxLength={6} value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center tracking-[0.5em] font-mono text-sm text-zinc-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 focus:bg-white"
                      required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">New Password</label>
                    <div className="relative">
                      <input type={forgotShowPassword ? 'text' : 'password'} placeholder="••••••••" value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 pr-11 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 focus:bg-white"
                        required />
                      <button type="button" onClick={() => setForgotShowPassword(!forgotShowPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                        {forgotShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={forgotLoading}
                    className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 cursor-pointer">
                    {forgotLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              )}
            </div>
          ) : (<>

          {/* Tab Selection */}
          <div className="mb-6 flex rounded-full border border-zinc-200 bg-zinc-100 p-1 gap-1">
            <button onClick={() => handleTabChange('email')}
              className={`flex-1 py-2 text-sm font-medium rounded-full cursor-pointer transition-all ${tab === 'email' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
              Admin
            </button>
            <button onClick={() => handleTabChange('pin')}
              className={`flex-1 py-2 text-sm font-medium rounded-full cursor-pointer transition-all ${tab === 'pin' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
              Staff PIN
            </button>
          </div>

          {tab === 'pin' ? (
            <div className="flex flex-col items-center">
              {staffError && (
                <div className="mb-4 w-full flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{staffError}</span>
                </div>
              )}
              <div className="w-full mb-5">
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Staff Email</label>
                <input type="email" placeholder="staff@restaurant.com" value={staffEmail}
                  onChange={(e) => { setStaffEmail(e.target.value); setPin(''); setStaffError(''); }}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 focus:bg-white"
                  required />
              </div>
              <div className="mb-5 flex flex-col items-center">
                <label className="block text-sm font-medium text-zinc-700 mb-3">Enter 6-digit PIN</label>
                <div className="flex gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`h-3 w-3 rounded-full border-2 transition-all duration-100 ${pin.length > i ? 'bg-orange-500 border-orange-500 scale-110' : 'border-zinc-300 bg-white'}`} />
                  ))}
                </div>
              </div>
              <div className="grid w-full max-w-[260px] grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9'].map((num) => (
                  <button key={num} onClick={() => handleKeyPress(num)} disabled={loadingStaff}
                    className="flex h-14 items-center justify-center rounded-xl border border-zinc-200 bg-white text-lg font-semibold text-zinc-800 transition hover:bg-zinc-50 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm">
                    {num}
                  </button>
                ))}
                <button onClick={handleClear} disabled={loadingStaff}
                  className="flex h-14 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-xs font-semibold text-red-500 transition hover:bg-red-100 active:scale-95 disabled:opacity-50 cursor-pointer">
                  Clear
                </button>
                <button onClick={() => handleKeyPress('0')} disabled={loadingStaff}
                  className="flex h-14 items-center justify-center rounded-xl border border-zinc-200 bg-white text-lg font-semibold text-zinc-800 transition hover:bg-zinc-50 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm">
                  0
                </button>
                <button onClick={handleBackspace} disabled={loadingStaff}
                  className="flex h-14 items-center justify-center rounded-xl border border-zinc-200 bg-white text-lg text-zinc-500 transition hover:bg-zinc-50 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm">
                  ⌫
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-5">
              {emailError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
                <input type="email" placeholder="admin@yourrestaurant.com" value={emailForm.email}
                  onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 focus:bg-white"
                  required />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-zinc-700">Password</label>
                  <button type="button" onClick={() => { setForgotStep('email'); setForgotEmail(emailForm.email); setForgotError(''); }}
                    className="text-xs font-medium text-orange-500 cursor-pointer hover:text-orange-600 transition bg-transparent border-0 p-0">Forgot?</button>
                </div>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={emailForm.password}
                    onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 pr-11 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 focus:bg-white"
                    required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loadingEmail}
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 cursor-pointer">
                {loadingEmail ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}
          </>)}
        </div>

        <p className="mt-6 text-sm text-zinc-600">
          New restaurant?{' '}
          <Link href="/register-admin" className="font-semibold text-orange-500 hover:text-orange-600 transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
