import React from 'react';
import { UtensilsCrossed, ConciergeBell, Flame, CreditCard, BarChart3 } from 'lucide-react';

const FEATURES = [
  { icon: <ConciergeBell className="h-4 w-4" />, label: 'Dine-in & Takeaway' },
  { icon: <Flame className="h-4 w-4" />, label: 'Live Kitchen View' },
  { icon: <CreditCard className="h-4 w-4" />, label: 'UPI / Cash / Card' },
  { icon: <BarChart3 className="h-4 w-4" />, label: 'Sales Reports' },
];

interface AuthLayoutProps {
  eyebrow?: string;
  pageTitle: string;
  pageSubtitle: string;
  children: React.ReactNode;
}

export function AuthLayout({
  eyebrow = 'Restaurant Command Centre',
  pageTitle,
  pageSubtitle,
  children,
}: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">

      {/* ── Brand panel ── */}
      <aside className="relative hidden overflow-hidden bg-[oklch(0.245_0.035_155)] text-[oklch(0.965_0.015_95)] lg:flex lg:flex-col lg:justify-between lg:p-14">
        <img
          src="/auth-kitchen.jpg"
          alt="Restaurant kitchen pass at service time"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'var(--gradient-ink)', opacity: 0.82 }}
          aria-hidden
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <UtensilsCrossed className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">KhaoPio</span>
          <span className="rounded-full border border-white/25 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.18em]">
            POS
          </span>
        </div>

        {/* Hero copy */}
        <div className="relative max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-400">{eyebrow}</p>
          <h2 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight">
            Every order, every table, every bill —{' '}
            <span className="text-brand-400">in one place.</span>
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70">
            Manage your menu, kitchen, staff and payments from a single fast POS built for Indian restaurants.
          </p>

          <ul className="mt-9 grid max-w-md grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <li
                key={f.label}
                className="flex items-center gap-2.5 rounded-full border border-white/12 bg-white/5 px-4 py-2.5 text-sm backdrop-blur-sm"
              >
                <span className="text-brand-400">{f.icon}</span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-6 text-xs text-white/45">
          <span>© {new Date().getFullYear()} KhaoPio</span>
          <span>Trusted by 1,200+ kitchens</span>
        </div>
      </aside>

      {/* ── Form panel ── */}
      <main className="flex items-center justify-center bg-[var(--background)] px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          {/* Mobile logo row */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-semibold">KhaoPio POS</span>
          </div>

          <h1 className="font-display text-4xl font-bold tracking-tight text-zinc-900">{pageTitle}</h1>
          <p className="mt-2 text-sm text-zinc-500">{pageSubtitle}</p>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_24px_60px_-28px_oklch(0.2_0.04_155_/_0.35)] sm:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export function ButtonSpinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white ${className}`}
    />
  );
}
