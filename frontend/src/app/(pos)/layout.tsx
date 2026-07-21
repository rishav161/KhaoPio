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

export default function POSLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Zustand Store States
  const activeOrders = usePOSStore((state) => state.activeOrders);
  const { user, token, sidebarItems, logout } = useAuthStore();
  
  // Settings dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

            {/* Settings Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-coral-500 active:scale-95 transition-all cursor-pointer ${
                  isDropdownOpen ? 'text-coral-500 border-coral-200 dark:border-coral-800' : ''
                }`}
                title="Settings"
              >
                <LucideIcons.Settings className="h-4.5 w-4.5" />
              </button>

              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 z-40 w-48 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-1.5 shadow-xl transition-all">
                    <button
                      onClick={() => {
                        router.push('/settings');
                        setIsDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-coral-500 transition-colors cursor-pointer"
                    >
                      <LucideIcons.User className="h-4 w-4" />
                      <span>Profile Settings</span>
                    </button>
                    {user?.role === 'SUPER_ADMIN' && (
                      <button
                        onClick={() => {
                          router.push('/coupons');
                          setIsDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-coral-500 transition-colors cursor-pointer border-t border-zinc-100 dark:border-zinc-800"
                      >
                        <LucideIcons.Ticket className="h-4 w-4" />
                        <span>Coupons & Promo</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

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
      <ConfirmDialog />
    </div>
  );
}
