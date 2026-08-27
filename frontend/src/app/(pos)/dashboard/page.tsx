'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag, RefreshCw, ArrowUpRight, ShieldAlert,
  BadgeCent, Sparkles, IndianRupee, Trophy, Clock,
  Table2, ArrowRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';
import { apiFetch } from '@/utils/api';
import { Table } from '@/components/Table';
import { Pagination } from '@/components/Pagination';
import { Loader } from '@/components/Loader';
import { useCurrencySymbol } from '@/utils/currency';
import { useAuthStore, consumeJustLoggedIn } from '@/store/useAuthStore';
import { usePOSStore } from '@/store/usePOSStore';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  metrics: {
    totalSales: number;
    ordersCount: number;
    aov: number;
    activeOrdersCount: number;
  };
  salesTrend: { date: string; amount: number; count: number }[];
  topItems: { name: string; quantity: number }[];
  paymentBreakdown: { method: string; amount: number; count: number }[];
  hourlyOrders: { hour: number; count: number }[];
  recentOrders: {
    id: string;
    orderNumber: number;
    grandTotal: number;
    status: string;
    paymentMethod: string;
    waiterName: string;
    createdAt: string;
  }[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

const PAYMENT_COLORS: Record<string, string> = {
  CASH: 'oklch(0.56 0.13 162)',
  CARD: 'rgb(59,130,246)',
  UPI: 'rgb(217,164,4)',
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  UPI: 'UPI',
};

const PRESETS = [
  { key: 'today', label: 'Today', days: 1 },
  { key: 'week', label: 'This week', days: 7 },
  { key: 'month', label: 'This month', days: 30 },
] as const;

function fmtDate(iso: string) {
  return iso.split('T')[0];
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function StatCard({
  icon, iconBg, label, value, delta, mono = true,
}: { icon: React.ReactNode; iconBg: string; label: string; value: string; delta?: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} mb-3`}>{icon}</div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold text-zinc-900 ${mono ? 'font-mono' : ''}`}>{value}</p>
      {delta && <p className="mt-1 text-xs font-medium text-brand-600">{delta}</p>}
    </div>
  );
}

export default function Dashboard() {
  const currencySymbol = useCurrencySymbol();
  const router = useRouter();
  const userName = useAuthStore((s) => s.user?.name) ?? '';
  const tables = usePOSStore((s) => s.tables);
  const fetchTables = usePOSStore((s) => s.fetchTables);

  const [activePreset, setActivePreset] = useState<(typeof PRESETS)[number]['key']>('week');
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [prevStats, setPrevStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [greetingMounted, setGreetingMounted] = useState(false);
  const [greetingVisible, setGreetingVisible] = useState(false);

  // Greeting toast: only right after a fresh login/signup redirect — fade in,
  // hold briefly, fade out, then unmount. A plain refresh or repeat visit to
  // /dashboard finds no flag and never shows it.
  useEffect(() => {
    if (!consumeJustLoggedIn()) return;
    setGreetingMounted(true);
    const raf = requestAnimationFrame(() => setGreetingVisible(true));
    const hide = setTimeout(() => setGreetingVisible(false), 3500);
    const unmount = setTimeout(() => setGreetingMounted(false), 4000);
    return () => { cancelAnimationFrame(raf); clearTimeout(hide); clearTimeout(unmount); };
  }, []);

  const range = useMemo(() => {
    const preset = PRESETS.find((p) => p.key === activePreset) ?? PRESETS[1];
    const end = new Date();
    const start = addDays(end, -(preset.days - 1));
    const prevEnd = addDays(start, -1);
    const prevStart = addDays(prevEnd, -(preset.days - 1));
    return {
      startDate: fmtDate(start.toISOString()),
      endDate: fmtDate(end.toISOString()),
      prevStartDate: fmtDate(prevStart.toISOString()),
      prevEndDate: fmtDate(prevEnd.toISOString()),
    };
  }, [activePreset]);

  const fetchStats = async (pg = 1) => {
    setLoading(true); setError('');
    try {
      const q = new URLSearchParams({ startDate: range.startDate, endDate: range.endDate, page: pg.toString(), limit: '5' });
      const prevQ = new URLSearchParams({ startDate: range.prevStartDate, endDate: range.prevEndDate, page: '1', limit: '1' });
      const [data, prevData] = await Promise.all([
        apiFetch<DashboardStats>(`/dashboard/stats?${q}`),
        apiFetch<DashboardStats>(`/dashboard/stats?${prevQ}`),
      ]);
      setStats(data);
      setPrevStats(prevData);
      setPage(pg);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(1); fetchTables(); }, [activePreset]);

  if (loading && !stats) return (
    <Loader size="lg" text="Compiling analytics..." className="h-full w-full bg-[var(--background)] rounded-xl border border-zinc-200" />
  );

  if (error && !stats) return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-400 mb-3" />
        <h2 className="text-sm font-black text-zinc-800">Failed to load dashboard</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-4">{error}</p>
        <button onClick={() => fetchStats()} className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-xs font-black cursor-pointer">Retry</button>
      </div>
    </div>
  );

  const metrics = stats?.metrics ?? { totalSales: 0, ordersCount: 0, aov: 0, activeOrdersCount: 0 };
  const prevMetrics = prevStats?.metrics ?? { totalSales: 0, ordersCount: 0, aov: 0, activeOrdersCount: 0 };
  const salesTrend = stats?.salesTrend ?? [];
  const topItems = stats?.topItems ?? [];
  const paymentBreakdown = stats?.paymentBreakdown ?? [];
  const hourlyOrders = stats?.hourlyOrders ?? [];
  const recentOrders = stats?.recentOrders ?? [];

  const pctDelta = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };
  const revenueDelta = pctDelta(metrics.totalSales, prevMetrics.totalSales);
  const ordersDelta = pctDelta(metrics.ordersCount, prevMetrics.ordersCount);
  const aovDelta = pctDelta(metrics.aov, prevMetrics.aov);

  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED').length;
  const totalTables = tables.length;
  const occupancyPct = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  const busiestDay = salesTrend.length > 0
    ? salesTrend.reduce((max, d) => (d.amount > max.amount ? d : max), salesTrend[0])
    : null;
  const busiestDayName = busiestDay ? new Date(busiestDay.date).toLocaleDateString(undefined, { weekday: 'long' }) : null;

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const firstName = userName.split(' ')[0] || 'there';

  const totalPaymentAmount = paymentBreakdown.reduce((s, p) => s + p.amount, 0);

  const peakHours = hourlyOrders.filter(h => h.hour >= 6 && h.hour <= 23).map(h => ({
    label: h.hour === 0 ? '12a' : h.hour < 12 ? `${h.hour}a` : h.hour === 12 ? '12p' : `${h.hour - 12}p`,
    count: h.count,
    hour: h.hour,
  }));
  const maxHourCount = Math.max(...peakHours.map(h => h.count), 1);

  const chartData = salesTrend.map(s => ({
    date: new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    amount: s.amount,
    orders: s.count,
  }));

  const maxQty = Math.max(...topItems.map(i => i.quantity), 1);
  const medalColors = ['text-amber-500', 'text-zinc-400', 'text-amber-700', 'text-zinc-500', 'text-zinc-400'];
  const barColors = ['from-brand-400 to-brand-500', 'from-brand-300 to-brand-400', 'from-brand-200 to-brand-300', 'from-zinc-300 to-zinc-400', 'from-zinc-200 to-zinc-300'];

  const getStatusBadge = (status: string) => {
    if (status === 'PAID') return <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">PAID</span>;
    if (status === 'CANCELLED') return <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600">CANCELLED</span>;
    return <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">{status}</span>;
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto bg-[var(--background)] p-1 pr-2 pb-4">

      {/* ── Transient greeting toast — fades in, holds briefly, fades out ── */}
      {greetingMounted && (
        <div
          className={`fixed top-20 right-6 z-40 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 shadow-lg transition-all duration-500 ease-out ${
            greetingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
              Good {timeGreeting}, {firstName}
              <Sparkles className="h-4 w-4 text-brand-500 shrink-0" />
            </p>
            <p className="text-xs text-zinc-500">Here&apos;s what&apos;s happening at your restaurant today.</p>
          </div>
        </div>
      )}

      {/* ── Insight banner ── */}
      {busiestDay && (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-[oklch(0.2_0.03_158)] px-6 py-5 text-white">
          <div className="flex items-center gap-4 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Sparkles className="h-5 w-5 text-brand-400" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">
                {revenueDelta >= 0 ? 'Great momentum this ' + (activePreset === 'today' ? 'day' : activePreset === 'month' ? 'month' : 'week') : 'Revenue is down this ' + (activePreset === 'today' ? 'day' : activePreset === 'month' ? 'month' : 'week')}
              </p>
              <p className="mt-0.5 text-sm text-white/60">
                Revenue is {revenueDelta >= 0 ? 'up' : 'down'} {Math.abs(revenueDelta).toFixed(1)}% compared to the previous period. {busiestDayName} was your busiest day.
              </p>
            </div>
          </div>
          <button onClick={() => router.push('/reports')} className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-white hover:text-brand-300 transition-colors cursor-pointer">
            View insights <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Period tabs ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1">
          {PRESETS.map((p) => (
            <button key={p.key} onClick={() => setActivePreset(p.key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                activePreset === p.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-sm text-zinc-400">
          {new Date(range.startDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
          {' — '}
          {new Date(range.endDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => fetchStats(page)}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:text-brand-600 hover:border-brand-300 transition-all cursor-pointer">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<IndianRupee className="h-4.5 w-4.5 text-brand-700" />}
          iconBg="bg-brand-100"
          label={activePreset === 'today' ? "Today's revenue" : 'Revenue'}
          value={`${currencySymbol}${metrics.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          delta={`${revenueDelta >= 0 ? '↗' : '↘'} ${Math.abs(revenueDelta).toFixed(1)}% vs previous period`}
        />
        <StatCard
          icon={<ShoppingBag className="h-4.5 w-4.5 text-blue-700" />}
          iconBg="bg-blue-100"
          label="Total orders"
          value={`${metrics.ordersCount}`}
          delta={`${ordersDelta >= 0 ? '↗' : '↘'} ${Math.abs(ordersDelta).toFixed(1)}% vs previous period`}
        />
        <StatCard
          icon={<BadgeCent className="h-4.5 w-4.5 text-amber-700" />}
          iconBg="bg-amber-100"
          label="Average order value"
          value={`${currencySymbol}${metrics.aov.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          delta={`${aovDelta >= 0 ? '↗' : '↘'} ${Math.abs(aovDelta).toFixed(1)}% vs previous period`}
        />
        <StatCard
          icon={<Table2 className="h-4.5 w-4.5 text-violet-700" />}
          iconBg="bg-violet-100"
          label="Active tables"
          value={totalTables > 0 ? `${occupiedTables} / ${totalTables}` : '—'}
          delta={totalTables > 0 ? `${occupancyPct}% occupancy now` : 'No tables configured'}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        <div className="relative lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
              <Loader size="sm" text="Loading trend..." />
            </div>
          )}
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-base font-semibold text-zinc-900">Revenue overview</h3>
              <p className="text-xs text-zinc-500">Daily performance for the selected period</p>
            </div>
          </div>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-zinc-900">
              {currencySymbol}{metrics.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className={`text-xs font-semibold ${revenueDelta >= 0 ? 'text-brand-600' : 'text-red-500'}`}>
              {revenueDelta >= 0 ? '↗' : '↘'} {Math.abs(revenueDelta).toFixed(1)}%
            </span>
            <span className="text-xs text-zinc-400">Revenue this {activePreset === 'today' ? 'day' : activePreset === 'month' ? 'month' : 'week'}</span>
          </p>

          {chartData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-xs text-zinc-400 font-semibold">No data for this range</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 12, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.56 0.13 162)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="oklch(0.56 0.13 162)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(161,161,170,0.15)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 600, fill: 'rgb(161,161,170)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis
                  tick={{ fontSize: 10, fontWeight: 600, fill: 'rgb(161,161,170)' }}
                  axisLine={false} tickLine={false} width={52}
                  tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                />
                <Tooltip
                  contentStyle={{ background: 'oklch(0.2 0.03 158)', border: 'none', borderRadius: '10px', fontSize: '11px', fontWeight: 600, color: 'white', padding: '8px 12px' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}
                  formatter={(value, name) => [name === 'amount' ? `${currencySymbol}${Number(value).toFixed(2)}` : value, name === 'amount' ? 'Sales' : 'Orders']}
                  cursor={{ stroke: 'oklch(0.56 0.13 162)', strokeWidth: 1, strokeDasharray: '4 2' }}
                />
                <Area type="monotone" dataKey="amount" stroke="oklch(0.56 0.13 162)" strokeWidth={2.5} fill="url(#salesGrad)" dot={false} activeDot={{ r: 5, fill: 'oklch(0.56 0.13 162)', stroke: 'white', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment breakdown donut (real "where revenue comes from" data) */}
        <div className="relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
              <Loader size="sm" text="Loading..." />
            </div>
          )}
          <h3 className="text-base font-semibold text-zinc-900">Payment methods</h3>
          <p className="text-xs text-zinc-500">How today&apos;s bills were paid</p>

          {paymentBreakdown.length === 0 ? (
            <div className="flex h-44 items-center justify-center text-xs text-zinc-400 font-semibold">No payment data</div>
          ) : (
            <>
              <div className="relative mt-2 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={paymentBreakdown} cx="50%" cy="50%" innerRadius={56} outerRadius={80} paddingAngle={3} dataKey="count" strokeWidth={0}>
                      {paymentBreakdown.map((entry, i) => (
                        <Cell key={i} fill={PAYMENT_COLORS[entry.method] ?? 'rgb(161,161,170)'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'oklch(0.2 0.03 158)', border: 'none', borderRadius: '10px', fontSize: '11px', fontWeight: 600, color: 'white', padding: '8px 12px' }}
                      formatter={(value) => [value, 'Orders']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute flex flex-col items-center">
                  <span className="text-2xl font-bold font-mono text-zinc-900">{metrics.ordersCount}</span>
                  <span className="text-xs text-zinc-400">orders</span>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {paymentBreakdown.map((p, i) => {
                  const pct = totalPaymentAmount > 0 ? ((p.amount / totalPaymentAmount) * 100).toFixed(0) : '0';
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: PAYMENT_COLORS[p.method] ?? 'rgb(161,161,170)' }} />
                        <span className="text-zinc-600">{PAYMENT_LABELS[p.method] ?? p.method}</span>
                      </div>
                      <span className="font-semibold text-zinc-900">{p.count} <span className="text-zinc-400 font-normal">{pct}%</span></span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Top dishes + Peak hours ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
              <Loader size="sm" text="Loading dishes..." />
            </div>
          )}
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-zinc-900 mb-4">
            <Trophy className="h-4 w-4 text-brand-600" />Top dishes
          </h3>
          {topItems.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-xs text-zinc-400 font-semibold py-12">No orders in this range</div>
          ) : (
            <div className="flex-1 flex flex-col justify-center gap-3.5">
              {topItems.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-xs font-black shrink-0 ${medalColors[i] || 'text-zinc-400'}`}>#{i + 1}</span>
                      <span className="truncate text-sm font-medium text-zinc-700">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold font-mono text-zinc-500 shrink-0">{item.quantity}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${barColors[i] || 'from-zinc-300 to-zinc-400'} transition-all duration-700 ease-out`} style={{ width: `${(item.quantity / maxQty) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
              <Loader size="sm" text="Loading..." />
            </div>
          )}
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-zinc-900 mb-3">
            <Clock className="h-4 w-4 text-brand-600" />Peak hours
          </h3>
          {peakHours.every(h => h.count === 0) ? (
            <div className="flex h-44 items-center justify-center text-xs text-zinc-400 font-semibold">No data for this range</div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={peakHours} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(161,161,170,0.15)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 600, fill: 'rgb(161,161,170)' }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 9, fontWeight: 600, fill: 'rgb(161,161,170)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'oklch(0.2 0.03 158)', border: 'none', borderRadius: '10px', fontSize: '11px', fontWeight: 600, color: 'white', padding: '8px 12px' }}
                  formatter={(value) => [value, 'Orders']}
                  labelFormatter={(label) => `Hour: ${label}`}
                  cursor={{ fill: 'oklch(0.56 0.13 162 / 0.08)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {peakHours.map((entry, i) => (
                    <Cell key={i} fill={entry.count === maxHourCount ? 'oklch(0.56 0.13 162)' : 'rgb(228,228,231)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent orders table ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-zinc-900">
            <ArrowUpRight className="h-4 w-4 text-brand-600" />Recent orders
          </h3>
          {stats && <span className="text-xs text-zinc-400">{stats.pagination.total} total</span>}
        </div>

        <Table
          headers={['Order', 'Date & Time', 'Waiter', 'Method', 'Status', 'Total']}
          data={recentOrders}
          loading={loading}
          emptyMessage="No orders found for this date range."
          renderRow={(order) => (
            <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors">
              <td className="px-4 py-3 text-xs font-black font-mono text-zinc-900">#{order.orderNumber}</td>
              <td className="px-4 py-3 text-xs font-mono text-zinc-400">
                {new Date(order.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className="px-4 py-3 text-xs font-bold text-zinc-700">{order.waiterName}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-black text-zinc-600">
                  {order.paymentMethod}
                </span>
              </td>
              <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
              <td className="px-4 py-3 text-xs font-black font-mono text-zinc-900">
                {currencySymbol}{order.grandTotal.toFixed(2)}
              </td>
            </tr>
          )}
        />

        {stats && (
          <div className="border-t border-zinc-100 px-4 py-2">
            <Pagination currentPage={page} totalPages={stats.pagination.totalPages} onPageChange={(p) => fetchStats(p)} />
          </div>
        )}
      </div>
    </div>
  );
}
