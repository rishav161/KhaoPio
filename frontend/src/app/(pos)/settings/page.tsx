'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { apiFetch } from '@/utils/api';
import { Loader } from '@/components/Loader';
import {
  Settings, User, Landmark, Phone, FileText, MapPin,
  Image, MessageSquare, Save, AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound,
  Upload, X, Loader2, QrCode, RefreshCw, Printer
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');

  // Change password states
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwShow, setPwShow] = useState({ current: false, next: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  // QR Code States
  const [activeQrSlug, setActiveQrSlug] = useState('');
  const [qrRegenLoading, setQrRegenLoading] = useState(false);

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setLogoError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setLogoError('Image must be under 5 MB.'); return; }

    setLogoUploading(true);
    setLogoError('');
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/restaurant/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setProfileLogo(data.logo);
    } catch (err: any) {
      setLogoError(err.message || 'Upload failed. Please try again.');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

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
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Store Logo</label>
                  <div className="flex items-center gap-4">
                    {/* Preview */}
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
                      {profileLogo ? (
                        profileLogo.startsWith('http') ? (
                          <img src={profileLogo} alt="logo" className="h-full w-full object-contain p-1" />
                        ) : (
                          <span className="text-3xl">{profileLogo}</span>
                        )
                      ) : (
                        <Image className="h-6 w-6 text-zinc-300" />
                      )}
                    </div>

                    {/* Upload area */}
                    <div className="flex-1 space-y-1.5">
                      <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-xs font-black transition-all ${
                        logoUploading
                          ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20 text-orange-500'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/10 text-zinc-500 hover:text-orange-500'
                      }`}>
                        {logoUploading ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /><span>Uploading...</span></>
                        ) : (
                          <><Upload className="h-4 w-4" /><span>Click to upload image</span></>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={logoUploading}
                        />
                      </label>
                      {logoError && (
                        <p className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                          <AlertCircle className="h-3 w-3" />{logoError}
                        </p>
                      )}
                      {profileLogo && profileLogo.startsWith('http') && (
                        <button
                          type="button"
                          onClick={() => setProfileLogo('')}
                          className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <X className="h-3 w-3" />Remove logo
                        </button>
                      )}
                      <p className="text-[9px] text-zinc-400">PNG, JPG, SVG · Max 5 MB · Will be cropped to square</p>
                    </div>
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

                {/* Save button */}
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

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* Digital Menu QR Code Card */}
              {user?.role === 'SUPER_ADMIN' && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3.5 mb-5">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/20 text-orange-500">
                        <QrCode className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-[10px] font-black uppercase tracking-widest text-orange-500">Public Digital Menu</span>
                        <span className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">Master QR Code & Link</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="p-3 bg-white border border-zinc-200 rounded-2xl shadow-xs">
                      <QRCodeSVG
                        value={typeof window !== 'undefined' ? `${window.location.origin}/m/${activeQrSlug || user?.restaurantId || 'default'}` : ''}
                        size={150}
                        level="H"
                        includeMargin={true}
                      />
                    </div>

                    <div className="w-full space-y-2">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Live Menu Public Link:
                      </p>
                      <p className="text-[10px] font-mono text-orange-500 bg-orange-50 dark:bg-orange-950/30 p-2 rounded-lg border border-orange-200 dark:border-orange-900/40 break-all select-all text-center">
                        {typeof window !== 'undefined' ? `${window.location.origin}/m/${activeQrSlug || user?.restaurantId || 'default'}` : ''}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const origin = typeof window !== 'undefined' ? window.location.origin : '';
                            const url = `${origin}/m/${activeQrSlug || user?.restaurantId || 'default'}`;
                            const restName = user?.restaurantName || 'KhaoPio Restaurant';
                            const printWindow = window.open('', '_blank');
                            if (!printWindow) return;

                            printWindow.document.write(`
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <title>Master Menu QR - ${restName}</title>
                                  <style>
                                    @media print { @page { size: 4in 6in; margin: 0; } body { margin: 0; } }
                                    body { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; background: #fff; color: #18181b; }
                                    .card { border: 3px solid #f97316; border-radius: 24px; padding: 28px; width: 100%; max-width: 320px; box-sizing: border-box; box-shadow: 0 10px 30px rgba(0,0,0,0.12); }
                                    .logo { font-size: 36px; margin-bottom: 4px; }
                                    .title { font-size: 22px; font-weight: 900; margin: 0 0 4px 0; color: #09090b; }
                                    .subtitle { font-size: 11px; font-weight: 800; color: #f97316; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; }
                                    .qr-box { background: #fafafa; border: 2px dashed #e4e4e7; border-radius: 16px; padding: 16px; display: inline-block; margin-bottom: 16px; }
                                    .instruction { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #27272a; margin: 0; }
                                    .url { font-size: 9px; color: #a1a1aa; word-break: break-all; margin-top: 8px; font-family: monospace; }
                                  </style>
                                </head>
                                <body>
                                  <div class="card">
                                    <div class="logo">🍽️</div>
                                    <h1 class="title">${restName}</h1>
                                    <div class="subtitle">Digital Menu & Touchless View</div>
                                    <div class="qr-box">
                                      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" width="180" height="180" alt="QR Code" />
                                    </div>
                                    <p class="instruction">📷 Scan with Smartphone Camera</p>
                                    <div class="url">${url}</div>
                                  </div>
                                  <script>
                                    window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
                                  </script>
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                          }}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Print QR Poster</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm('Are you sure you want to generate a new QR Code? All previously printed physical QR posters will immediately be revoked and stop working!')) return;
                            setQrRegenLoading(true);
                            try {
                              const data = await apiFetch<{ qrSlug: string }>('/menu/regenerate-qr', { method: 'POST' });
                              setActiveQrSlug(data.qrSlug);
                              setSuccess(true);
                            } catch (err: any) {
                              setError(err.message || 'Failed to regenerate QR code.');
                            } finally {
                              setQrRegenLoading(false);
                            }
                          }}
                          disabled={qrRegenLoading}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${qrRegenLoading ? 'animate-spin' : ''}`} />
                          <span>Regenerate QR</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
    </div>
  );
}
