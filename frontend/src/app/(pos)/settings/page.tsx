'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { apiFetch } from '@/utils/api';
import { Loader } from '@/components/Loader';
import {
  Settings, User, Landmark, Phone, FileText, MapPin,
  Image, MessageSquare, Save, AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound
} from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '@/utils/currency';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  // States
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileRestaurant, setProfileRestaurant] = useState(user?.restaurantName || '');
  const [profileTaxRate, setProfileTaxRate] = useState('5.0');
  const [profileServiceCharge, setProfileServiceCharge] = useState('5.0');
  const [profileAddress, setProfileAddress] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileGstin, setProfileGstin] = useState('');
  const [profileLogo, setProfileLogo] = useState('');
  const [profileThankYouMessage, setProfileThankYouMessage] = useState('');
  const [profileCurrency, setProfileCurrency] = useState(user?.currency || 'INR');

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Change password states
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwShow, setPwShow] = useState({ current: false, next: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch restaurant details on load for Super Admin
  useEffect(() => {
    if (isMounted) {
      if (user?.role === 'SUPER_ADMIN') {
        apiFetch<{
          defaultTaxRate: number;
          defaultServiceCharge: number;
          address: string | null;
          phone: string | null;
          gstin: string | null;
          logo: string | null;
          thankYouMessage: string | null;
          currency: string;
        }>('/auth/restaurant')
          .then((data) => {
            setProfileTaxRate(data.defaultTaxRate.toString());
            setProfileServiceCharge(data.defaultServiceCharge.toString());
            setProfileAddress(data.address || '');
            setProfilePhone(data.phone || '');
            setProfileGstin(data.gstin || '');
            setProfileLogo(data.logo || '');
            setProfileThankYouMessage(data.thankYouMessage || '');
            setProfileCurrency(data.currency || 'INR');
            setPageLoading(false);
          })
          .catch((err) => {
            console.error('Failed to load settings:', err);
            setPageLoading(false);
          });
      } else {
        setPageLoading(false);
      }
    }
  }, [isMounted, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // 1. Update personal profile name if changed
      if (profileName.trim() !== user?.name) {
        await apiFetch('/auth/profile', {
          method: 'PATCH',
          body: { name: profileName.trim() },
        });
      }

      // 2. Update restaurant details if Super Admin
      if (user?.role === 'SUPER_ADMIN') {
        const bodyPayload: any = {};
        bodyPayload.name = profileRestaurant.trim();
        bodyPayload.defaultTaxRate = parseFloat(profileTaxRate);
        bodyPayload.defaultServiceCharge = parseFloat(profileServiceCharge);
        bodyPayload.address = profileAddress.trim() || null;
        bodyPayload.phone = profilePhone.trim() || null;
        bodyPayload.gstin = profileGstin.trim() || null;
        bodyPayload.logo = profileLogo.trim() || null;
        bodyPayload.thankYouMessage = profileThankYouMessage.trim() || null;
        bodyPayload.currency = profileCurrency;

        await apiFetch('/auth/restaurant', {
          method: 'PATCH',
          body: bodyPayload,
        });
      }

      // 3. Update Zustand local auth state
      updateUser(profileName.trim(), profileRestaurant.trim(), profileCurrency);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (pwForm.next !== pwForm.confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwForm.next.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    setPwLoading(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'PATCH',
        body: { currentPassword: pwForm.current, newPassword: pwForm.next },
      });
      setPwForm({ current: '', next: '', confirm: '' });
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  if (pageLoading) {
    return <Loader size="lg" text="Loading settings configuration..." className="h-full w-full" />;
  }

  return (
    <div className="h-full w-full overflow-y-auto pb-8 pr-1">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3.5 mb-6">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-500">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50">Settings & Profile</h1>
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Configure restaurant defaults and personal credentials</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <form onSubmit={handleSave} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900 p-3 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900 p-3 text-xs font-bold text-emerald-650 dark:text-emerald-400 flex items-center gap-2 animate-bounce">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
              <span>Settings updated successfully!</span>
            </div>
          )}

          {/* Section 1: Personal Credentials */}
          <div className="space-y-4">
            <span className="block text-[10px] font-black uppercase tracking-widest text-orange-500">Personal Information</span>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Staff Member Name</label>
              <div className="relative">
                <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value.replace(/[^a-zA-Z\s'\-]/g, ''))}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-xs font-semibold outline-none focus:border-orange-400 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Restaurant Identity & POS configuration */}
          <div className="border-t border-zinc-150 dark:border-zinc-800 pt-5 mt-5 space-y-4">
            <span className="block text-[10px] font-black uppercase tracking-widest text-orange-500">Restaurant Settings</span>
            
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Restaurant Workspace Name</label>
              <div className="relative">
                <Landmark className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  value={profileRestaurant}
                  onChange={(e) => setProfileRestaurant(e.target.value)}
                  disabled={user?.role !== 'SUPER_ADMIN'}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-xs font-semibold outline-none focus:border-orange-400 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  required
                />
              </div>
            </div>

            {user?.role === 'SUPER_ADMIN' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Default Tax (GST %)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0"
                      value={profileTaxRate}
                      onChange={(e) => setProfileTaxRate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-xs font-semibold outline-none focus:border-orange-400 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Service Charge (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0"
                      value={profileServiceCharge}
                      onChange={(e) => setProfileServiceCharge(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-xs font-semibold outline-none focus:border-orange-400 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Store Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input 
                        type="text" 
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value.replace(/[^0-9+\-\s()]/g, ''))}
                        placeholder="+91 98765 43210"
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-xs font-semibold outline-none focus:border-orange-400 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">GSTIN / Tax ID</label>
                    <div className="relative">
                      <FileText className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input 
                        type="text" 
                        value={profileGstin}
                        onChange={(e) => setProfileGstin(e.target.value)}
                        placeholder="27AAAAA1111A1Z1"
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-xs font-semibold outline-none focus:border-orange-400 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Store Address</label>
                  <div className="relative">
                    <MapPin className="absolute top-3 left-3 h-4 w-4 text-zinc-400" />
                    <textarea 
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      placeholder="e.g. 123 Main Street, City, Pin Code"
                      rows={2}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-xs font-semibold outline-none focus:border-orange-400 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-all resize-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Store Logo (URL or Symbol)</label>
                  <div className="relative">
                    <Image className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input 
                      type="text" 
                      value={profileLogo}
                      onChange={(e) => setProfileLogo(e.target.value)}
                      placeholder="e.g. 🍔 or https://logo-url"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-xs font-semibold outline-none focus:border-orange-400 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Custom Invoice Footer</label>
                  <div className="relative">
                    <MessageSquare className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input 
                      type="text" 
                      value={profileThankYouMessage}
                      onChange={(e) => setProfileThankYouMessage(e.target.value)}
                      placeholder="Thank you for dining with us!"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-10 text-xs font-semibold outline-none focus:border-orange-400 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Base Currency</label>
                  <select
                    value={profileCurrency}
                    onChange={(e) => setProfileCurrency(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-xs font-semibold outline-none focus:border-orange-400 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-all cursor-pointer"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="flex pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 cursor-pointer rounded-lg bg-orange-500 hover:bg-orange-600 text-white py-3 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 active:scale-[0.98] shadow-md shadow-orange-100 dark:shadow-none"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/20 text-orange-500">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase tracking-widest text-orange-500">Security</span>
            <span className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">Change Password</span>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4" autoComplete="off">
          {pwError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900 p-3 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{pwError}</span>
            </div>
          )}
          {pwSuccess && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Password changed successfully!</span>
            </div>
          )}

          {(['current', 'next', 'confirm'] as const).map((field) => {
            const labels = { current: 'Current Password', next: 'New Password', confirm: 'Confirm New Password' };
            return (
              <div key={field}>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">
                  {labels[field]}
                </label>
                <div className="relative">
                  <input
                    type={pwShow[field] ? 'text' : 'password'}
                    value={pwForm[field]}
                    onChange={(e) => setPwForm({ ...pwForm, [field]: e.target.value })}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pl-3 pr-10 text-xs font-semibold outline-none focus:border-orange-400 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-all"
                    required
                  />
                  <button type="button"
                    onClick={() => setPwShow({ ...pwShow, [field]: !pwShow[field] })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                    {pwShow[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            );
          })}

          <div className="flex pt-1">
            <button type="submit" disabled={pwLoading}
              className="w-full flex items-center justify-center gap-1.5 cursor-pointer rounded-lg bg-orange-500 hover:bg-orange-600 text-white py-3 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 active:scale-[0.98] shadow-md shadow-orange-100 dark:shadow-none">
              {pwLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      </div>
    </div>
  );
}
