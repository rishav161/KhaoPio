'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import { usePOSStore } from '@/store/usePOSStore';
import { useAuthStore } from '@/store/useAuthStore';
import { apiFetch } from '@/utils/api';
import { Loader } from '@/components/Loader';

// Dynamic Icon Renderer for database-seeded navigation menus
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <IconComponent className={className} />;
};

export default function POSLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Zustand Store States
  const activeOrders = usePOSStore((state) => state.activeOrders);
  const { user, token, sidebarItems, logout } = useAuthStore();
  
  // Profile settings states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileRestaurant, setProfileRestaurant] = useState(user?.restaurantName || '');
  const [profileTaxRate, setProfileTaxRate] = useState('5.0');
  const [profileServiceCharge, setProfileServiceCharge] = useState('5.0');
  const [profileAddress, setProfileAddress] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileGstin, setProfileGstin] = useState('');
  const [profileLogo, setProfileLogo] = useState('');
  const [profileThankYouMessage, setProfileThankYouMessage] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  const updateUserStore = useAuthStore((state) => state.updateUser);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfileRestaurant(user.restaurantName || '');
    }
  }, [user]);

  // Fetch restaurant details when profile opens
  useEffect(() => {
    if (isProfileOpen && user?.role === 'SUPER_ADMIN') {
      apiFetch<{
        defaultTaxRate: number;
        defaultServiceCharge: number;
        address: string | null;
        phone: string | null;
        gstin: string | null;
        logo: string | null;
        thankYouMessage: string | null;
      }>('/auth/restaurant')
        .then((data) => {
          setProfileTaxRate(data.defaultTaxRate.toString());
          setProfileServiceCharge(data.defaultServiceCharge.toString());
          setProfileAddress(data.address || '');
          setProfilePhone(data.phone || '');
          setProfileGstin(data.gstin || '');
          setProfileLogo(data.logo || '');
          setProfileThankYouMessage(data.thankYouMessage || '');
        })
        .catch((err) => {
          console.error('Failed to load restaurant settings:', err);
        });
    }
  }, [isProfileOpen, user?.role]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess(false);

    try {
      if (profileName.trim() !== user?.name) {
        await apiFetch('/auth/profile', {
          method: 'PATCH',
          body: { name: profileName.trim() },
        });
      }

      const bodyPayload: any = {};
      if (profileRestaurant.trim() !== user?.restaurantName) {
        bodyPayload.name = profileRestaurant.trim();
      }

      if (user?.role === 'SUPER_ADMIN') {
        bodyPayload.defaultTaxRate = parseFloat(profileTaxRate);
        bodyPayload.defaultServiceCharge = parseFloat(profileServiceCharge);
        bodyPayload.address = profileAddress.trim() || null;
        bodyPayload.phone = profilePhone.trim() || null;
        bodyPayload.gstin = profileGstin.trim() || null;
        bodyPayload.logo = profileLogo.trim() || null;
        bodyPayload.thankYouMessage = profileThankYouMessage.trim() || null;
      }

      if (Object.keys(bodyPayload).length > 0) {
        await apiFetch('/auth/restaurant', {
          method: 'PATCH',
          body: bodyPayload,
        });
      }

      updateUserStore(profileName.trim(), profileRestaurant.trim());
      setProfileSuccess(true);
      setTimeout(() => {
        setProfileSuccess(false);
        setIsProfileOpen(false);
      }, 1000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update settings.');
    } finally {
      setProfileLoading(false);
    }
  };
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Guard the routes: Redirect to login if token is missing
  useEffect(() => {
    if (isMounted && !token) {
      router.push('/login');
    }
  }, [token, router, isMounted]);

  // Load and apply theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('pos-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        setTheme('dark');
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  // Toggle light/dark mode
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('pos-theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Real-time clock for POS header
  const [time, setTime] = useState('');
  useEffect(() => {
    setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute order counts for sidebar badges
  const kdsCount = activeOrders.filter(
    (o) => o.status === 'KITCHEN_PENDING' || o.status === 'PREPARING'
  ).length;
  
  const readyCount = activeOrders.filter((o) => o.status === 'READY').length;

  // Don't render layout if not authenticated or if sidebar navigation is still loading
  if (!isMounted || !token || sidebarItems.length === 0) {
    return (
      <Loader 
        size="lg" 
        text="Loading store interface..." 
        className="h-screen w-screen bg-zinc-50 dark:bg-zinc-950" 
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 antialiased transition-colors duration-200">
      
      {/* Sidebar mobile backdrop overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Dynamic left sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-24 flex-col items-center border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md transition-transform duration-300 md:static md:translate-x-0 shrink-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Mobile Close Button */}
        <div className="md:hidden flex w-full justify-end p-2 border-b border-zinc-150 dark:border-zinc-800">
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <LucideIcons.X className="h-4 w-4" />
          </button>
        </div>

        {/* Logo / Brand */}
        <div className="flex h-16 w-full items-center justify-center border-b border-zinc-250 dark:border-zinc-800 bg-coral-500 text-white shadow-inner">
          <div className="flex flex-col items-center">
            <span className="text-sm font-black tracking-wider">Khao</span>
            <span className="text-[10px] font-bold text-coral-100 leading-none">Pio</span>
          </div>
        </div>

        {/* Dynamic Navigation Items */}
        <nav className="flex flex-1 w-full flex-col gap-1.5 p-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.path;
            
            // Map badging dynamics
            let badgeCount: number | null = null;
            let badgeColor = '';

            if (item.path === '/kitchen') {
              badgeCount = kdsCount > 0 ? kdsCount : null;
              badgeColor = 'bg-coral-500 text-white animate-pulse';
            } else if (item.path === '/checkout') {
              badgeCount = readyCount > 0 ? readyCount : null;
              badgeColor = 'bg-emerald-600 dark:bg-emerald-700 text-white font-bold';
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  router.push(item.path);
                  setIsSidebarOpen(false);
                }}
                className={`relative flex flex-col items-center justify-center rounded-xl py-3 text-center transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-coral-500 text-white shadow-md shadow-coral-100 dark:shadow-none'
                    : 'text-zinc-550 dark:text-zinc-405 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <DynamicIcon name={item.icon || 'HelpCircle'} className={`h-5.5 w-5.5 ${isActive ? 'scale-110' : ''}`} />
                <span className="mt-1 text-[9px] font-black uppercase tracking-tight truncate max-w-full px-1">
                  {item.label}
                </span>

                {/* Badge */}
                {badgeCount !== null && (
                  <span
                    className={`absolute right-1.5 top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[9px] font-black leading-none ${
                      badgeColor || 'bg-zinc-800 dark:bg-zinc-700 text-white'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>



        {/* Footer info in sidebar */}
        <div className="flex flex-col items-center gap-1 border-t border-zinc-200 dark:border-zinc-800 py-3 text-zinc-400 w-full">
          <LucideIcons.Wifi className="h-4 w-4 text-emerald-500" />
          <span className="text-[8px] font-black uppercase tracking-wider text-emerald-500">
            Online
          </span>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Dynamic Header */}
        <header className="flex h-12 w-full items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
            >
              <LucideIcons.Menu className="h-4.5 w-4.5" />
            </button>
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-200 truncate max-w-[80px] sm:max-w-none">
              {user?.restaurantName || 'KhaoPio'}
            </span>
            <span className="hidden sm:inline text-zinc-300 dark:text-zinc-850 font-normal">|</span>
            <span className="hidden sm:inline text-xs font-semibold text-zinc-500 dark:text-zinc-450">
              Staff: {user ? `${user.name} (${user.role.replace('_', ' ')})` : 'Terminal #01'}
            </span>
          </div>
          
          <div className="flex items-center gap-2.5 sm:gap-4 text-xs font-bold text-zinc-700 dark:text-zinc-300">
            {/* Clock */}
            <div className="hidden sm:flex items-center gap-1 border-r border-zinc-200 dark:border-zinc-800 pr-4">
              <LucideIcons.Clock className="h-3.5 w-3.5 text-zinc-400" />
              <span className="font-mono">{time}</span>
            </div>
            
            {/* Orders Badge */}
            <div className="border-r border-zinc-200 dark:border-zinc-800 pr-2.5 sm:pr-4 flex items-center">
              <span className="hidden sm:inline text-zinc-400 dark:text-zinc-500 mr-1">Orders: </span>
              <span className="font-extrabold text-coral-500 bg-coral-50 dark:bg-coral-950/20 border border-coral-200 dark:border-coral-900 rounded-md px-1.5 py-0.5 text-[10px]">
                {activeOrders.length}
              </span>
            </div>

            {/* Profile Settings Button */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-coral-500 active:scale-95 transition-all cursor-pointer"
              title="Profile Settings"
            >
              <LucideIcons.User className="h-4.5 w-4.5" />
            </button>

            {/* Light/Dark Toggle */}
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
              title="Toggle theme"
            >
              {theme === 'dark' ? (
                <LucideIcons.Sun className="h-4.5 w-4.5 text-amber-500" />
              ) : (
                <LucideIcons.Moon className="h-4.5 w-4.5 text-zinc-500" />
              )}
            </button>

            {/* Logout/Exit Button */}
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-955 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900 active:scale-95 transition-all cursor-pointer"
              title="Exit Session"
            >
              <LucideIcons.LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-hidden p-3 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
          {children}
        </main>
      </div>

      {/* PROFILE & RESTAURANT SETTINGS MODAL */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xl transition-all duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                <LucideIcons.Settings className="h-4.5 w-4.5 text-coral-500" />
                <span>Profile Settings</span>
              </h3>
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-150 dark:hover:bg-zinc-800 hover:text-zinc-650 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                <LucideIcons.X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {profileError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-2.5 text-[10px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <LucideIcons.AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}
              {profileSuccess && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 p-2.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-450 flex items-center gap-1.5">
                  <LucideIcons.Check className="h-3.5 w-3.5 shrink-0" />
                  <span>Settings updated successfully!</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Staff Member Name</label>
                <input 
                  type="text" 
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs font-semibold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Restaurant Name</label>
                <input 
                  type="text" 
                  value={profileRestaurant}
                  onChange={(e) => setProfileRestaurant(e.target.value)}
                  disabled={user?.role !== 'SUPER_ADMIN'}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs font-semibold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                />
              </div>

              {user?.role === 'SUPER_ADMIN' && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-3 space-y-4">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-coral-500 font-bold mb-1">POS & Invoice Configuration</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1 font-bold">Default Tax (GST %)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="0"
                        value={profileTaxRate}
                        onChange={(e) => setProfileTaxRate(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1 font-bold">Service Charge (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="0"
                        value={profileServiceCharge}
                        onChange={(e) => setProfileServiceCharge(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1 font-bold">Store Phone</label>
                      <input 
                        type="text" 
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1 font-bold">GSTIN / Tax ID</label>
                      <input 
                        type="text" 
                        value={profileGstin}
                        onChange={(e) => setProfileGstin(e.target.value)}
                        placeholder="27AAAAA1111A1Z1"
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1 font-bold">Store Address</label>
                    <input 
                      type="text" 
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      placeholder="123 Main St, City, Country"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs font-semibold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1 font-bold">Store Logo (URL or Symbol)</label>
                    <input 
                      type="text" 
                      value={profileLogo}
                      onChange={(e) => setProfileLogo(e.target.value)}
                      placeholder="e.g. 🍔 or https://logo-url"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs font-semibold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1 font-bold">Custom Invoice Footer</label>
                    <input 
                      type="text" 
                      value={profileThankYouMessage}
                      onChange={(e) => setProfileThankYouMessage(e.target.value)}
                      placeholder="Thank you for dining with us!"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs font-semibold outline-none focus:border-coral-500 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex-1 rounded-lg border border-zinc-250 dark:border-zinc-850 bg-white dark:bg-zinc-900 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="flex-1 rounded-lg bg-coral-500 hover:bg-coral-600 text-white py-2.5 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                >
                  {profileLoading ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
