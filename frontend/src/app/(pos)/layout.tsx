'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import { usePOSStore } from '@/store/usePOSStore';
import { useAuthStore } from '@/store/useAuthStore';
import { apiFetch } from '@/utils/api';
import { Loader } from '@/components/Loader';
import { ConfirmDialog } from '@/components/ConfirmDialog';

// Dynamic Icon Renderer for database-seeded navigation menus
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <IconComponent className={className} />;
};

// Nav items that belong in the pinned bottom group (Reports, Help), everything
// else scrolls in the primary list above it.
const SECONDARY_PATHS = ['/reports', '/help'];

export default function POSLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Zustand Store States
  const activeOrders = usePOSStore((state) => state.activeOrders);
  const kots = usePOSStore((state) => state.kots);
  const { user, token, sidebarItems, setSidebarItems, logout } = useAuthStore();

  // Profile dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Restaurant logo
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
  useEffect(() => {
    if (isMounted && token) {
      apiFetch<any>('/auth/restaurant').then(d => setRestaurantLogo(d.logo || null)).catch(() => {});
    }
  }, [isMounted, token]);

  // Guard the routes: Redirect to login if token is missing, or to onboarding if restaurantId is missing
  useEffect(() => {
    if (isMounted) {
      if (!token) {
        router.push('/login');
      } else if (user && !user.restaurantId) {
        router.push('/register-admin');
      }
    }
  }, [token, user, router, isMounted]);

  // Always re-fetch navigation on mount so sidebar labels stay in sync with DB
  useEffect(() => {
    if (isMounted && token) {
      apiFetch<any[]>('/navigation')
        .then((items) => setSidebarItems(items))
        .catch(() => {});
    }
  }, [isMounted, token]);

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

  // Poll KOTs every 10s so the kitchen sidebar badge stays accurate on any page
  // (fetchActiveOrders is intentionally excluded — each page polls it with its own includePaid param,
  //  and calling it here without includePaid would wipe PAID orders from the store and cause flicker)
  useEffect(() => {
    if (!isMounted || !token) return;
    usePOSStore.getState().fetchActiveKots();
    const interval = setInterval(() => usePOSStore.getState().fetchActiveKots(), 10000);
    return () => clearInterval(interval);
  }, [isMounted, token]);

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
  const kdsCount = kots.filter(
    (k) => k.status === 'PENDING' || k.status === 'PREPARING'
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

  const primaryItems = sidebarItems.filter((item) => !SECONDARY_PATHS.some((p) => item.path.startsWith(p)));
  const secondaryItems = sidebarItems.filter((item) => SECONDARY_PATHS.some((p) => item.path.startsWith(p)));

  const initials = (user?.name || '?')
    .split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  const roleLabel = user ? user.role.replace('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) : '';

  const renderNavItem = (item: (typeof sidebarItems)[number]) => {
    const isActive = pathname === item.path;
    let badgeCount: number | null = null;
    let badgeColor = '';

    if (item.path === '/kitchen') {
      badgeCount = kdsCount > 0 ? kdsCount : null;
      badgeColor = 'bg-brand-500 text-white animate-pulse';
    } else if (item.path === '/checkout') {
      badgeCount = readyCount > 0 ? readyCount : null;
      badgeColor = 'bg-emerald-600 text-white font-bold';
    } else if (item.path === '/orders') {
      badgeCount = activeOrders.length > 0 ? activeOrders.length : null;
      badgeColor = 'bg-brand-100 text-brand-700 font-bold';
    }

    return (
      <button
        key={item.id}
        onClick={() => {
          if (item.path === '/help') {
            sessionStorage.setItem('help_return_path', pathname);
          }
          router.push(item.path);
          setIsSidebarOpen(false);
        }}
        className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all duration-150 cursor-pointer ${
          isActive
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
        }`}
      >
        <DynamicIcon name={item.icon || 'HelpCircle'} className="h-4.5 w-4.5 shrink-0" />
        <span className="flex-1 truncate text-sm font-semibold">{item.label}</span>
        {badgeCount !== null && (
          <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none ${
            isActive ? 'bg-white/20 text-white' : badgeColor || 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
          }`}>
            {badgeCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 antialiased transition-colors duration-200">

      {/* Sidebar mobile backdrop overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md transition-transform duration-300 md:static md:translate-x-0 shrink-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Mobile Close Button */}
        <div className="md:hidden flex w-full justify-end p-2 border-b border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <LucideIcons.X className="h-4 w-4" />
          </button>
        </div>

        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-900 dark:bg-zinc-800">
            {restaurantLogo && restaurantLogo.startsWith('http') ? (
              <img src={restaurantLogo} alt="logo" className="h-full w-full object-contain p-1.5" />
            ) : restaurantLogo ? (
              <span className="text-xl">{restaurantLogo}</span>
            ) : (
              <LucideIcons.UtensilsCrossed className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              {user?.restaurantName || 'KhaoPio'}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">POS</p>
          </div>
        </div>

        {/* Outlet indicator */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <span className="flex-1 truncate text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {user?.restaurantName || 'Main outlet'}
            </span>
          </div>
        </div>

        {/* Primary navigation */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-1">
          {primaryItems.map(renderNavItem)}
        </nav>

        {/* Secondary navigation, pinned near the bottom */}
        {secondaryItems.length > 0 && (
          <nav className="flex flex-col gap-1 px-3 pb-2">
            {secondaryItems.map(renderNavItem)}
          </nav>
        )}

        {/* Profile footer */}
        <div className="relative border-t border-zinc-200 dark:border-zinc-800 p-3">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-950/40 text-sm font-bold text-brand-700 dark:text-brand-400">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{user?.name}</p>
              <p className="truncate text-xs text-zinc-400">{roleLabel}</p>
            </div>
            <LucideIcons.MoreHorizontal className="h-4 w-4 shrink-0 text-zinc-400" />
          </button>

          {isProfileOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsProfileOpen(false)} />
              <div className="absolute bottom-full left-3 right-3 z-40 mb-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-1.5 shadow-xl">
                <button
                  onClick={() => { router.push('/settings'); setIsProfileOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-brand-600 transition-colors cursor-pointer"
                >
                  <LucideIcons.User className="h-4 w-4" /> Profile Settings
                </button>
                {user?.role === 'SUPER_ADMIN' && (
                  <button
                    onClick={() => { router.push('/coupons'); setIsProfileOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-brand-600 transition-colors cursor-pointer border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <LucideIcons.Ticket className="h-4 w-4" /> Coupons & Promo
                  </button>
                )}
                <button
                  onClick={toggleTheme}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-brand-600 transition-colors cursor-pointer border-t border-zinc-100 dark:border-zinc-800"
                >
                  {theme === 'dark' ? <LucideIcons.Sun className="h-4 w-4" /> : <LucideIcons.Moon className="h-4 w-4" />}
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <button
                  onClick={() => { logout(); router.push('/login'); }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer border-t border-zinc-100 dark:border-zinc-800"
                >
                  <LucideIcons.LogOut className="h-4 w-4" /> Exit Session
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main View Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Minimal top bar */}
        <header className="flex h-12 w-full items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
            >
              <LucideIcons.Menu className="h-4.5 w-4.5" />
            </button>

            {/* Back button — shown only on sub-pages (path not in sidebar) */}
            {!sidebarItems.some((item) => item.path === pathname) && (
              <button
                onClick={() => router.back()}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 hover:bg-brand-50 dark:hover:bg-brand-950/20 hover:text-brand-500 hover:border-brand-200 dark:hover:border-brand-800 active:scale-95 transition-all cursor-pointer"
                title="Go back"
              >
                <LucideIcons.ArrowLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400">
            <LucideIcons.Clock className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-mono">{time}</span>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-hidden p-3 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
          {children}
        </main>
      </div>
      <ConfirmDialog />
    </div>
  );
}
