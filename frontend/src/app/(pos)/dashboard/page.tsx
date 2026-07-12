'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, ShoppingBag, Coins, Flame, RefreshCw, 
  ArrowUpRight, Clock, ShieldAlert, BadgeCent, Calendar
} from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { Table } from '@/components/Table';
import { Pagination } from '@/components/Pagination';
import { Loader } from '@/components/Loader';

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
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function Dashboard() {
  // Query Filters State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to last 7 days for dashboard
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);

  // States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async (targetPage = page) => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        page: targetPage.toString(),
        limit: '5',
      });
      const data = await apiFetch<DashboardStats>(`/dashboard/stats?${queryParams.toString()}`);
      setStats(data);
      setPage(targetPage);
    } catch (err: any) {
      setError(err.message || 'Failed to synchronize dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(page);
  }, [page]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStats(1);
  };

  // Quick Presets
  const applyPreset = (preset: 'today' | 'yesterday' | '7days' | '30days') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'yesterday':
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        start = yesterday;
        end = yesterday;
        break;
      case '7days':
        const last7 = new Date();
        last7.setDate(today.getDate() - 6);
        start = last7;
        end = today;
        break;
      case '30days':
        const last30 = new Date();
        last30.setDate(today.getDate() - 29);
        start = last30;
        end = today;
        break;
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    setStartDate(startStr);
    setEndDate(endStr);
    
    setLoading(true);
    const queryParams = new URLSearchParams({
      startDate: startStr,
      endDate: endStr,
      page: '1',
      limit: '5',
    });
    apiFetch<DashboardStats>(`/dashboard/stats?${queryParams.toString()}`)
      .then(data => {
        setStats(data);
        setPage(1);
      })
      .catch(err => setError(err.message || 'Failed to fetch preset statistics.'))
      .finally(() => setLoading(false));
  };

  if (loading && !stats) {
    return (
      <Loader
        size="lg"
        text="Compiling store analytics..."
        className="h-full w-full bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800"
      />
    );
  }

  if (error && !stats) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 text-center text-zinc-800 dark:text-zinc-100">
        <div className="max-w-md">
          <ShieldAlert className="mx-auto h-12 w-12 text-red-500 mb-3" />
          <h2 className="text-lg font-black uppercase tracking-wider">Analytics Error</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 mb-4 font-semibold">{error}</p>
          <button 
            onClick={() => fetchStats(1)}
            className="rounded-lg bg-coral-500 hover:bg-coral-600 text-white px-4 py-2 text-xs font-black uppercase tracking-wider transition-all"
          >
            Retry Sync
          </button>
        </div>
      </div>
    );
  }

  const salesTrendData = stats?.salesTrend || [];
  const topItemsData = stats?.topItems || [];
  const recentOrdersData = stats?.recentOrders || [];
  const metricsData = stats?.metrics || { totalSales: 0, ordersCount: 0, aov: 0, activeOrdersCount: 0 };

  // Draw Line Chart variables
  const maxSale = Math.max(...salesTrendData.map(s => s.amount), 1);
  const trendPoints = salesTrendData.map((s, idx) => {
    const x = salesTrendData.length > 1 ? (idx / (salesTrendData.length - 1)) * 100 : 50;
    const y = 100 - (s.amount / maxSale) * 80 - 10;
    return { x, y, date: s.date, amount: s.amount };
  });

  const linePath = trendPoints.map(p => `${p.x},${p.y}`).join(' L ');
  const areaPath = trendPoints.length > 0 ? `0,100 L ${linePath} L 100,100 Z` : '';

  // Draw Bar Chart variables
  const maxQty = Math.max(...topItemsData.map(i => i.quantity), 1);

  // Status Badge Colors helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 text-[10px] font-black text-emerald-700 dark:text-emerald-450">PAID</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center rounded-md bg-red-50 dark:bg-red-950/20 px-2 py-1 text-[10px] font-black text-red-750 dark:text-red-400">CANCELLED</span>;
      default:
        return <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-950/20 px-2 py-1 text-[10px] font-black text-amber-700 dark:text-amber-450">{status}</span>;
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-250 font-sans">
      
      {/* Title Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-coral-500" />
            <span>Executive Dashboard</span>
          </h1>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Real-time billing statistics, performance metrics, and sales trend summaries.
          </p>
        </div>
        
        <button
          onClick={() => fetchStats(page)}
          className="flex items-center gap-1.5 self-start rounded-lg border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* Date Filter & Presets Console */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm mb-6 transition-all">
        <form onSubmit={handleApplyFilters} className="space-y-4">
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 mb-2 font-bold">Quick Date Presets</span>
            <div className="flex flex-wrap gap-2">
              {['today', 'yesterday', '7days', '30days'].map((preset) => {
                const label = preset === '7days' ? 'Last 7 Days' : preset === '30days' ? 'Last 30 Days' : preset.charAt(0).toUpperCase() + preset.slice(1);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyPreset(preset as any)}
                    className="rounded-lg bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-955 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-750 dark:text-zinc-300 transition-all cursor-pointer"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 mb-1.5 flex items-center gap-1 font-bold">
                <Calendar className="h-3.5 w-3.5 text-coral-500" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-250 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 py-2 px-3 text-xs outline-none focus:border-coral-500 font-semibold text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 mb-1.5 flex items-center gap-1 font-bold">
                <Calendar className="h-3.5 w-3.5 text-coral-500" />
                <span>End Date</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-250 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 py-2 px-3 text-xs outline-none focus:border-coral-500 font-semibold text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full rounded-lg bg-coral-500 hover:bg-coral-600 text-white py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-coral-100 dark:shadow-none"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Grid KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Total Sales */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex items-center justify-between transition-all duration-200">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Total Sales</span>
            <span className="text-2xl font-black tracking-tight font-mono text-zinc-900 dark:text-zinc-50">
              ${metricsData.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-coral-50 dark:bg-coral-950/20 text-coral-500 flex items-center justify-center">
            <Coins className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: Paid Orders */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex items-center justify-between transition-all duration-200">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Paid Orders</span>
            <span className="text-2xl font-black tracking-tight font-mono text-zinc-900 dark:text-zinc-50">
              {metricsData.ordersCount}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-coral-50 dark:bg-coral-950/20 text-coral-500 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>

        {/* Card 3: AOV */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex items-center justify-between transition-all duration-200">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Avg Order Value</span>
            <span className="text-2xl font-black tracking-tight font-mono text-zinc-900 dark:text-zinc-50">
              ${metricsData.aov.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-coral-50 dark:bg-coral-950/20 text-coral-500 flex items-center justify-center">
            <BadgeCent className="h-5 w-5" />
          </div>
        </div>

        {/* Card 4: Active Orders */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex items-center justify-between transition-all duration-200">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Active KOT Queue</span>
            <span className="text-2xl font-black tracking-tight font-mono text-zinc-900 dark:text-zinc-50 text-coral-500">
              {metricsData.activeOrdersCount}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-coral-500 text-white flex items-center justify-center shadow-lg shadow-coral-100 dark:shadow-none animate-pulse">
            <Flame className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* CHART 1: Sales Trend (Line Chart) */}
        <div className="relative lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xs rounded-xl">
              <Loader size="md" text="Syncing trend..." />
            </div>
          )}
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-1.5">
            <Clock className="h-4.5 w-4.5 text-coral-500" />
            <span>Sales Trend (Date Filtered)</span>
          </h3>
          
          <div className="relative h-64 w-full">
            {salesTrendData.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-400">
                No trend data available for this range.
              </div>
            ) : (
              <>
                <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(249, 115, 22)" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="rgb(249, 115, 22)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="90" x2="100" y2="90" stroke="rgba(228,228,231,0.5)" strokeWidth="0.5" strokeDasharray="2,2" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(228,228,231,0.5)" strokeWidth="0.5" strokeDasharray="2,2" />
                  <line x1="0" y1="10" x2="100" y2="10" stroke="rgba(228,228,231,0.5)" strokeWidth="0.5" strokeDasharray="2,2" />

                  {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}
                  {linePath && <path d={`M ${linePath}`} fill="none" stroke="rgb(249, 115, 22)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
                </svg>
                
                {trendPoints.map((pt, idx) => (
                  <div 
                    key={idx} 
                    className="absolute group"
                    style={{ left: `${pt.x}%`, top: `${pt.y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <div className="h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 bg-coral-500 shadow-md group-hover:scale-125 transition-transform cursor-pointer"></div>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 pointer-events-none rounded bg-zinc-900/95 dark:bg-zinc-800 text-[10px] font-black text-white px-2 py-1 shadow-lg transition-all duration-150 z-10 whitespace-nowrap">
                      ${pt.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          
          <div className="flex justify-between mt-3 text-[10px] font-bold text-zinc-400 font-mono px-2 overflow-x-auto gap-2">
            {salesTrendData.map((s, idx) => {
              // Only render dates selectively if there are too many items to prevent overlap
              const renderLabel = salesTrendData.length <= 10 || idx === 0 || idx === salesTrendData.length - 1 || idx === Math.floor(salesTrendData.length / 2);
              return (
                <span key={idx} className={renderLabel ? '' : 'invisible'}>
                  {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              );
            })}
          </div>
        </div>

        {/* CHART 2: Top Selling Items (Bar Chart) */}
        <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex flex-col">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xs rounded-xl">
              <Loader size="md" text="Syncing dishes..." />
            </div>
          )}
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-1.5">
            <ArrowUpRight className="h-4.5 w-4.5 text-coral-500" />
            <span>Top Dishes (Units Sold)</span>
          </h3>

          <div className="flex-1 flex flex-col justify-center space-y-4">
            {topItemsData.length === 0 ? (
              <div className="text-center text-xs font-bold text-zinc-400 py-12">
                No paid orders recorded in this range.
              </div>
            ) : (
              topItemsData.map((item, idx) => {
                const widthPercent = (item.quantity / maxQty) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      <span className="truncate">{item.name}</span>
                      <span className="font-mono">{item.quantity} units</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-coral-400 to-coral-600 transition-all duration-500 ease-out"
                        style={{ width: `${widthPercent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="mb-4 flex-1">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-3 pl-1">
          Recent Orders Log
        </h3>
        
        <Table
          headers={['Order ID', 'Date & Time', 'Waiter', 'Method', 'Status', 'Grand Total']}
          data={recentOrdersData}
          loading={loading}
          emptyMessage="No recent orders found matching criteria."
          renderRow={(order) => (
            <tr key={order.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors">
              <td className="px-5 py-3 font-mono font-black text-zinc-950 dark:text-zinc-100">
                #{order.orderNumber}
              </td>
              <td className="px-5 py-3 text-zinc-400 font-mono">
                {new Date(order.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="px-5 py-3 font-bold">{order.waiterName}</td>
              <td className="px-5 py-3">
                <span className="font-bold text-[10px] tracking-wider bg-zinc-100 dark:bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-800">
                  {order.paymentMethod}
                </span>
              </td>
              <td className="px-5 py-3">{getStatusBadge(order.status)}</td>
              <td className="px-5 py-3 font-mono font-black text-zinc-950 dark:text-zinc-50">
                ${order.grandTotal.toFixed(2)}
              </td>
            </tr>
          )}
        />

        {stats && (
          <Pagination
            currentPage={page}
            totalPages={stats.pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
