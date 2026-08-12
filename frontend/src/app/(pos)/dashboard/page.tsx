'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp, ShoppingBag, RefreshCw, ArrowUpRight, ShieldAlert,
  BadgeCent, Flame, Calendar, IndianRupee, Trophy,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiFetch } from '@/utils/api';
import { Table } from '@/components/Table';
import { Pagination } from '@/components/Pagination';
import { Loader } from '@/components/Loader';
import { useCurrencySymbol } from '@/utils/currency';

interface DashboardStats {
  metrics: {
    totalSales: number;
    ordersCount: number;
    aov: number;
    activeOrdersCount: number;
  };
  salesTrend: { date: string; amount: number; count: number }[];
  topItems: { name: string; quantity: number }[];
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

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7days', label: '7 Days' },
  { key: '30days', label: '30 Days' },
] as const;

export default function Dashboard() {
  const currencySymbol = useCurrencySymbol();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activePreset, setActivePreset] = useState<string>('7days');
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async (sd = startDate, ed = endDate, pg = page) => {
    setLoading(true); setError('');
    try {
      const q = new URLSearchParams({ startDate: sd, endDate: ed, page: pg.toString(), limit: '5' });
      const data = await apiFetch<DashboardStats>(`/dashboard/stats?${q}`);
      setStats(data); setPage(pg);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const applyPreset = (preset: typeof PRESETS[number]['key']) => {
    const today = new Date();
    let start = new Date(), end = new Date();
    if (preset === 'today') { start = today; end = today; }
    else if (preset === 'yesterday') { start.setDate(today.getDate() - 1); end.setDate(today.getDate() - 1); }
    else if (preset === '7days') { start.setDate(today.getDate() - 6); end = today; }
    else if (preset === '30days') { start.setDate(today.getDate() - 29); end = today; }
    const sd = start.toISOString().split('T')[0];
    const ed = end.toISOString().split('T')[0];
    setStartDate(sd); setEndDate(ed); setActivePreset(preset);
    fetchStats(sd, ed, 1);
  };

  const handleApplyFilters = (e: React.FormEvent) => { e.preventDefault(); setActivePreset(''); fetchStats(startDate, endDate, 1); };

  if (loading && !stats) return (
    <Loader size="lg" text="Compiling analytics..." className="h-full w-full bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800" />
  );

  if (error && !stats) return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-400 mb-3" />
        <h2 className="text-sm font-black text-zinc-800 dark:text-zinc-100">Failed to load dashboard</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-4">{error}</p>
        <button onClick={() => fetchStats()} className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-black cursor-pointer">Retry</button>
      </div>
    </div>
  );

  const metrics = stats?.metrics ?? { totalSales: 0, ordersCount: 0, aov: 0, activeOrdersCount: 0 };
  const salesTrend = stats?.salesTrend ?? [];
  const topItems = stats?.topItems ?? [];
  const recentOrders = stats?.recentOrders ?? [];

  // Format trend data for Recharts
  const chartData = salesTrend.map(s => ({
    date: new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    amount: s.amount,
    orders: s.count,
  }));

  // Bar chart
  const maxQty = Math.max(...topItems.map(i => i.quantity), 1);
  const medalColors = ['text-amber-500', 'text-zinc-400', 'text-amber-700', 'text-zinc-500', 'text-zinc-400'];
  const barColors = ['from-orange-400 to-orange-500', 'from-orange-300 to-orange-400', 'from-orange-200 to-orange-300', 'from-zinc-300 to-zinc-400', 'from-zinc-200 to-zinc-300'];

  const getStatusBadge = (status: string) => {
    if (status === 'PAID') return <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400">PAID</span>;
    if (status === 'CANCELLED') return <span className="rounded-md bg-red-50 dark:bg-red-950/30 px-2 py-0.5 text-[10px] font-black text-red-600 dark:text-red-400">CANCELLED</span>;
    return <span className="rounded-md bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-400">{status}</span>;
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-1 pr-2">

      {/* ── Header + Filter toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-black text-zinc-900 dark:text-zinc-50">
            <TrendingUp className="h-5 w-5 text-orange-500 shrink-0" />
            Dashboard
          </h1>
        </div>

        {/* Preset pills */}
        <div className="flex items-center gap-1.5">
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => applyPreset(p.key)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition-all cursor-pointer ${
                activePreset === p.key
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-orange-300 hover:text-orange-500'
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        <form onSubmit={handleApplyFilters} className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setActivePreset(''); }}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 outline-none focus:border-orange-400 cursor-pointer" />
          <span className="text-xs text-zinc-400">→</span>
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setActivePreset(''); }}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 outline-none focus:border-orange-400 cursor-pointer" />
          <button type="submit"
            className="flex items-center gap-1 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-700 dark:hover:bg-zinc-300 text-white dark:text-zinc-900 px-3 py-1.5 text-[11px] font-black transition-all cursor-pointer">
            <Calendar className="h-3 w-3" />Apply
          </button>
        </form>

        <button onClick={() => fetchStats()}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-[11px] font-black text-zinc-600 dark:text-zinc-400 hover:text-orange-500 hover:border-orange-300 transition-all cursor-pointer">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Sales */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 shadow-md shadow-orange-200 dark:shadow-none">
            <IndianRupee className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Total Sales</p>
            <p className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-50 truncate">
              {currencySymbol}{metrics.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Paid Orders */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500 shadow-md shadow-blue-200 dark:shadow-none">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Paid Orders</p>
            <p className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-50">{metrics.ordersCount}</p>
          </div>
        </div>

        {/* AOV */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500 shadow-md shadow-violet-200 dark:shadow-none">
            <BadgeCent className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Avg Order Value</p>
            <p className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-50 truncate">
              {currencySymbol}{metrics.aov.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Active KOT */}
        <div className={`rounded-xl border p-4 shadow-sm flex items-center gap-4 transition-colors ${
          metrics.activeOrdersCount > 0
            ? 'border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20'
            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
        }`}>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md ${
            metrics.activeOrdersCount > 0 ? 'bg-orange-500 shadow-orange-200 dark:shadow-none animate-pulse' : 'bg-zinc-200 dark:bg-zinc-800 shadow-none'
          }`}>
            <Flame className={`h-5 w-5 ${metrics.activeOrdersCount > 0 ? 'text-white' : 'text-zinc-400'}`} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Active KOT</p>
            <p className={`text-xl font-black font-mono ${metrics.activeOrdersCount > 0 ? 'text-orange-500' : 'text-zinc-900 dark:text-zinc-50'}`}>
              {metrics.activeOrdersCount}
            </p>
          </div>
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Sales Trend line chart */}
        <div className="relative lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
              <Loader size="sm" text="Loading trend..." />
            </div>
          )}
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <TrendingUp className="h-4 w-4 text-orange-500" />Sales Trend
            </h3>
            {salesTrend.length > 0 && (
              <span className="text-[10px] font-bold text-zinc-400">
                {new Date(salesTrend[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                {' → '}
                {new Date(salesTrend[salesTrend.length - 1].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          {chartData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-xs text-zinc-400 font-semibold">
              No data for this range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={208}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(249,115,22)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="rgb(249,115,22)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(161,161,170,0.15)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fontWeight: 700, fill: 'rgb(161,161,170)' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fontWeight: 700, fill: 'rgb(161,161,170)' }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgb(24,24,27)',
                    border: '1px solid rgb(63,63,70)',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'white',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ color: 'rgb(161,161,170)', marginBottom: 4 }}
                  formatter={(value, name) => [
                    name === 'amount' ? `${currencySymbol}${Number(value).toFixed(2)}` : value,
                    name === 'amount' ? 'Sales' : 'Orders',
                  ]}
                  cursor={{ stroke: 'rgb(249,115,22)', strokeWidth: 1, strokeDasharray: '4 2' }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="rgb(249,115,22)"
                  strokeWidth={2.5}
                  fill="url(#salesGrad)"
                  dot={{ fill: 'rgb(249,115,22)', strokeWidth: 2, stroke: 'white', r: 3 }}
                  activeDot={{ r: 5, fill: 'rgb(249,115,22)', stroke: 'white', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top dishes bar chart */}
        <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex flex-col">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
              <Loader size="sm" text="Loading dishes..." />
            </div>
          )}
          <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">
            <Trophy className="h-4 w-4 text-orange-500" />Top Dishes
          </h3>

          {topItems.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-xs text-zinc-400 font-semibold py-12">
              No orders in this range
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center gap-3.5">
              {topItems.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-[11px] font-black shrink-0 ${medalColors[i] || 'text-zinc-400'}`}>#{i + 1}</span>
                      <span className="truncate text-[11px] font-bold text-zinc-700 dark:text-zinc-300">{item.name}</span>
                    </div>
                    <span className="text-[10px] font-black font-mono text-zinc-500 shrink-0">{item.quantity}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barColors[i] || 'from-zinc-300 to-zinc-400'} transition-all duration-700 ease-out`}
                      style={{ width: `${(item.quantity / maxQty) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent orders table ── */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <ArrowUpRight className="h-4 w-4 text-orange-500" />Recent Orders
          </h3>
          {stats && <span className="text-[10px] font-bold text-zinc-400">{stats.pagination.total} total</span>}
        </div>

        <Table
          headers={['Order', 'Date & Time', 'Waiter', 'Method', 'Status', 'Total']}
          data={recentOrders}
          loading={loading}
          emptyMessage="No orders found for this date range."
          renderRow={(order) => (
            <tr key={order.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
              <td className="px-4 py-3 text-xs font-black font-mono text-zinc-900 dark:text-zinc-100">#{order.orderNumber}</td>
              <td className="px-4 py-3 text-xs font-mono text-zinc-400">
                {new Date(order.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className="px-4 py-3 text-xs font-bold text-zinc-700 dark:text-zinc-300">{order.waiterName}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[10px] font-black text-zinc-600 dark:text-zinc-300">
                  {order.paymentMethod}
                </span>
              </td>
              <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
              <td className="px-4 py-3 text-xs font-black font-mono text-zinc-900 dark:text-zinc-50">
                {currencySymbol}{order.grandTotal.toFixed(2)}
              </td>
            </tr>
          )}
        />

        {stats && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-2">
            <Pagination currentPage={page} totalPages={stats.pagination.totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
