'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader } from '@/components/Loader';

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);
  const returnPath = React.useRef<string>('/orders');

  useEffect(() => {
    setIsMounted(true);
    const saved = sessionStorage.getItem('help_return_path');
    if (saved) returnPath.current = saved;
  }, []);

  useEffect(() => {
    if (isMounted && !token) {
      router.push('/login');
    }
  }, [isMounted, token, router]);

  if (!isMounted || !token) {
    return (
      <Loader
        size="lg"
        text="Loading..."
        className="h-screen w-screen bg-[#FAFAF9]"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-zinc-950 text-[#1C1917] dark:text-zinc-100 font-sans antialiased">
      {/* Minimal sticky header */}
      <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-[#E7E5E4] dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-4">
        <button
          onClick={() => router.push(returnPath.current)}
          className="group flex items-center gap-1.5 text-xs font-bold text-[#78716C] dark:text-zinc-400 hover:text-[#f97316] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to App
        </button>

        <span className="text-xs font-black uppercase tracking-[0.12em] text-[#1C1917] dark:text-zinc-200">
          KhaoPio Help
        </span>

        <div className="w-20" />
      </header>

      <main>{children}</main>
    </div>
  );
}
