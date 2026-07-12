'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, KeyRound, Lock, AlertTriangle, Shield, Users, Smartphone, Eye, EyeOff } from 'lucide-react';
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
      if (useAuthStore.getState().user?.role === 'SUPER_ADMIN') {
        router.push('/dashboard');
      } else {
        router.push('/billing');
      }
    }
  }, [token, router, isMounted]);

  // Tab state: 'pin' (staff email + PIN quick login) or 'email' (admin password login)
  const [tab, setTab] = useState<'pin' | 'email'>('pin');

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
      if (response.user.role === 'SUPER_ADMIN') {
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

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-950 px-4 font-sans antialiased text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      
      {/* Light/Dark backdrop coral glow */}
      <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-coral-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] translate-x-1/2 translate-y-1/2 rounded-full bg-amber-500/5 blur-[120px] pointer-events-none"></div>

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-2xl transition-all duration-300">
        
        {/* Colorful top border strip */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-coral-500 via-amber-500 to-yellow-400"></div>

        {/* Brand / Logo */}
        <div className="mb-6 text-center">
          <span className="text-[10px] font-black tracking-[0.25em] text-coral-500 uppercase block mb-1">
            Terminal Access
          </span>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center justify-center gap-1.5">
            <Smartphone className="h-6 w-6 text-coral-500" />
            <span>KhaoPio</span>
          </h1>
        </div>

        {/* Tab Selection */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-950 p-1 border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => handleTabChange('pin')}
            className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-md cursor-pointer transition-all ${
              tab === 'pin'
                ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-sm border border-zinc-200/50 dark:border-zinc-800'
                : 'text-zinc-500 dark:text-zinc-450 hover:text-zinc-850 dark:hover:text-zinc-200'
            }`}
          >
            <Users className="h-4 w-4 text-coral-500" />
            Staff PIN
          </button>
          <button
            onClick={() => handleTabChange('email')}
            className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-md cursor-pointer transition-all ${
              tab === 'email'
                ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-sm border border-zinc-200/50 dark:border-zinc-800'
                : 'text-zinc-500 dark:text-zinc-450 hover:text-zinc-850 dark:hover:text-zinc-200'
            }`}
          >
            <Shield className="h-4 w-4 text-coral-500" />
            Admin Portal
          </button>
        </div>

        {/* Main Render Panel */}
        {tab === 'pin' ? (
          /* Email + PIN quick login flow */
          <div className="flex flex-col items-center">
            {staffError && (
              <div className="mb-4 w-full flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-3 text-center text-xs font-bold text-red-600 dark:text-red-400 animate-shake">
                <AlertTriangle className="h-4 w-4 shrink-0 mx-auto" />
                <span>{staffError}</span>
              </div>
            )}

            {/* Staff Email Input */}
            <div className="w-full mb-4">
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Staff Email
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  placeholder="waiter@khaopio.com"
                  value={staffEmail}
                  onChange={(e) => {
                    setStaffEmail(e.target.value);
                    setPin('');
                    setStaffError('');
                  }}
                  className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500"
                  required
                />
              </div>
            </div>

            {/* PIN Code Dots Indicator */}
            <div className="mb-5 flex flex-col items-center">
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                6-Digit PIN
              </label>
              <div className="flex gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-4.5 w-4.5 rounded-full border-2 transition-all duration-100 ${
                      pin.length > i
                        ? 'bg-coral-500 border-coral-500 scale-110 shadow-lg shadow-coral-500/40'
                        : 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-950'
                    }`}
                  ></div>
                ))}
              </div>
            </div>

            {/* Keypad Layout */}
            <div className="grid w-full max-w-[280px] grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(num)}
                  disabled={loadingStaff}
                  className="flex h-15 items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xl font-black text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700/60 transition-all cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-750 active:scale-95 shadow-sm disabled:opacity-50"
                >
                  {num}
                </button>
              ))}
              
              <button
                onClick={handleClear}
                disabled={loadingStaff}
                className="flex h-15 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/20 text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400 border border-red-100 dark:border-red-950 transition-all cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95 shadow-sm disabled:opacity-50"
              >
                Clear
              </button>
              <button
                onClick={() => handleKeyPress('0')}
                disabled={loadingStaff}
                className="flex h-15 items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xl font-black text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700/60 transition-all cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-750 active:scale-95 shadow-sm disabled:opacity-50"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                disabled={loadingStaff}
                className="flex h-15 items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-800 text-lg font-black text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 transition-all cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-750 active:scale-95 shadow-sm disabled:opacity-50"
              >
                ⌫
              </button>
            </div>
          </div>
        ) : (
          /* Email & Password Admin login */
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-2">
              Administrator Login
            </h2>

            {emailError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-3.5 text-xs font-bold text-red-650 dark:text-red-400">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                <span>{emailError}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  placeholder="e.g. admin@yourrestaurant.com"
                  value={emailForm.email}
                  onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                  className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-coral-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={emailForm.password}
                  onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
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

            <button
              type="submit"
              disabled={loadingEmail}
              className="w-full cursor-pointer rounded-lg bg-coral-500 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-coral-600 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-coral-100 dark:shadow-none"
            >
              {loadingEmail ? 'Authorizing Portal...' : 'Unlock Portal'}
            </button>
          </form>
        )}

        {/* Footer / Setup navigation Link */}
        <div className="mt-8 border-t border-zinc-250 dark:border-zinc-800 pt-5 text-center">
          <Link
            href="/register-admin"
            className="text-[11px] font-black text-coral-500 hover:text-coral-600 transition-colors uppercase tracking-wider"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
