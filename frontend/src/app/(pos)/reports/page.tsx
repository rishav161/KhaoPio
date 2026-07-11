'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, RefreshCw, Calendar, CreditCard, 
  Coins, ShoppingBag, Percent, Receipt, ShieldAlert
} from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { Table } from '@/components/Table';
import { Pagination } from '@/components/Pagination';

interface ReportResponse {
  summary: {
    totalRevenue: number;
    totalTax: number;
    totalOrders: number;
  };
  orders: {
    id: string;
    orderNumber: number;
    grandTotal: number;
    taxTotal: number;
    subtotal: number;
    status: string;
    paymentMethod: string;
    waiterName: string;
    cashierName: string;
    createdAt: string;
    itemCount: number;
    itemsSummary: string;
  }[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function Reports() {
  // Query Filters State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Default to last 30 days
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [page, setPage] = useState(1);

  // API Responses
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = async (targetPage = page) => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        paymentMethod,
        page: targetPage.toString(),
        limit: '10',
      });
      const data = await apiFetch<ReportResponse>(`/reports/sales?${queryParams.toString()}`);
      setReportData(data);
      setPage(targetPage);
    } catch (err: any) {
      setError(err.message || 'Failed to synchronize reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(1); // Reset to page 1 on filter mount/change
  }, [paymentMethod]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport(1);
  };

  // Date Presets Helper
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
    
    // Automatically trigger fetch after state updates
    setTimeout(() => {
      // Direct call because state binding is asynchronous
      setLoading(true);
      const queryParams = new URLSearchParams({
        startDate: startStr,
        endDate: endStr,
        paymentMethod,
        page: '1',
        limit: '10',
      });
      apiFetch<ReportResponse>(`/reports/sales?${queryParams.toString()}`)
        .then(data => {
          setReportData(data);
          setPage(1);
        })
        .catch(err => setError(err.message || 'Failed to fetch preset reports.'))
        .finally(() => setLoading(false));
    }, 50);
  };

  const handlePageChange = (newPage: number) => {
    fetchReport(newPage);
  };

  // Helper for Order Status rendering
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
    <div className="flex h-full flex-col overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-250">
      
      {/* Title Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-coral-500" />
            <span>Sales & Activity Reports</span>
          </h1>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Generate detailed transaction logs, analyze tax components, and filter sales records.
          </p>
        </div>
        
        <button
          onClick={() => fetchReport()}
          className="flex items-center gap-1.5 self-start rounded-lg border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin-hover" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Filter and Presets Console */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm mb-6 transition-all">
        <form onSubmit={handleApplyFilters} className="space-y-4">
          
          {/* Quick Date Presets */}
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">Quick Date Presets</span>
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 mb-1.5 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-coral-500" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-250 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 py-2 px-3 text-xs outline-none focus:border-coral-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 mb-1.5 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-coral-500" />
                <span>End Date</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-250 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 py-2 px-3 text-xs outline-none focus:border-coral-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 mb-1.5 flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-coral-500" />
                <span>Payment Method</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-zinc-250 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 py-2.5 px-3 text-xs outline-none focus:border-coral-500 font-semibold"
              >
                <option value="ALL">All Transactions</option>
                <option value="CASH">Cash Payments</option>
                <option value="CARD">Card Payments</option>
                <option value="UPI">UPI / Digital Wallet</option>
              </select>
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

      {/* error state */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 text-xs font-bold text-red-650 dark:text-red-400">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {reportData && (
        <>
          {/* Summary Mini-Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-coral-50 dark:bg-coral-950/20 text-coral-500 flex items-center justify-center">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Filtered Sales Revenue</span>
                <h4 className="text-xl font-black font-mono text-zinc-955 dark:text-zinc-50 leading-tight">
                  ${reportData.summary.totalRevenue.toFixed(2)}
                </h4>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-coral-50 dark:bg-coral-950/20 text-coral-500 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Filtered Orders Count</span>
                <h4 className="text-xl font-black font-mono text-zinc-955 dark:text-zinc-50 leading-tight">
                  {reportData.summary.totalOrders}
                </h4>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-coral-50 dark:bg-coral-950/20 text-coral-500 flex items-center justify-center">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Tax Component Total</span>
                <h4 className="text-xl font-black font-mono text-zinc-955 dark:text-zinc-50 leading-tight">
                  ${reportData.summary.totalTax.toFixed(2)}
                </h4>
              </div>
            </div>
          </div>

          {/* Transactions Log Table */}
          <div className="flex-1 min-h-[300px]">
            <Table
              headers={['ID', 'Date', 'Waiter', 'Cashier', 'Method', 'Dish Logs', 'Subtotal', 'Tax', 'Grand Total']}
              data={reportData.orders}
              loading={loading}
              emptyMessage="No transaction logs match the filter criteria."
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
                  <td className="px-5 py-3 font-semibold">{order.cashierName}</td>
                  <td className="px-5 py-3">
                    <span className="font-bold text-[10px] tracking-wider bg-zinc-100 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-full">
                      {order.paymentMethod}
                    </span>
                  </td>
                  <td className="px-5 py-3 max-w-xs truncate" title={order.itemsSummary}>
                    {order.itemsSummary}
                  </td>
                  <td className="px-5 py-3 font-mono">${order.subtotal.toFixed(2)}</td>
                  <td className="px-5 py-3 font-mono text-zinc-400">${order.taxTotal.toFixed(2)}</td>
                  <td className="px-5 py-3 font-mono font-black text-zinc-950 dark:text-zinc-50">
                    ${order.grandTotal.toFixed(2)}
                  </td>
                </tr>
              )}
            />

            {/* Pagination Controls */}
            <Pagination
              currentPage={page}
              totalPages={reportData.pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
