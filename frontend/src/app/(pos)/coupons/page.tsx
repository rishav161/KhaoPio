'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { apiFetch } from '@/utils/api';
import { Loader } from '@/components/Loader';
import { 
  Ticket, Plus, Trash2, CheckCircle2, AlertCircle, X, 
  Calendar, Percent, DollarSign, ToggleLeft, ToggleRight, Info 
} from 'lucide-react';
import { useConfirmStore } from '@/store/useConfirmStore';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minSubtotal: number;
  maxDiscount: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export default function CouponsPage() {
  const { user } = useAuthStore();
  const confirm = useConfirmStore((state) => state.confirm);
  const [isMounted, setIsMounted] = useState(false);

  // States
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Creation Drawer/Modal state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minSubtotal, setMinSubtotal] = useState('0');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchCoupons = async () => {
    try {
      const data = await apiFetch<Coupon[]>('/coupons');
      setCoupons(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch coupons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted) {
      fetchCoupons();
    }
  }, [isMounted]);

  // Handle active/inactive status toggle
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/coupons/${id}`, {
        method: 'PATCH',
        body: { isActive: !currentStatus },
      });
      setCoupons((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !currentStatus } : c))
      );
      setSuccess(`Coupon status updated successfully!`);
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status.');
    }
  };

  // Handle delete
  const handleDeleteCoupon = (id: string) => {
    confirm({
      title: 'Delete Coupon',
      message: 'Are you sure you want to delete this coupon code permanently?',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        setError('');
        setSuccess('');
        try {
          await apiFetch(`/coupons/${id}`, {
            method: 'DELETE',
          });
          setCoupons((prev) => prev.filter((c) => c.id !== id));
          setSuccess('Coupon code deleted successfully.');
          setTimeout(() => setSuccess(''), 2500);
        } catch (err: any) {
          setError(err.message || 'Failed to delete coupon.');
        }
      }
    });
  };

  // Submit creation
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!code || discountValue === undefined || !startDate || !endDate) {
      setError('Please fill in all required fields.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      setError('Start date cannot be in the past.');
      return;
    }

    if (end < start) {
      setError('End date must be at or after the start date.');
      return;
    }

    setFormLoading(true);
    try {
      const newCoupon = await apiFetch<Coupon>('/coupons', {
        method: 'POST',
        body: {
          code: code.toUpperCase(),
          description: description || null,
          discountType,
          discountValue: parseFloat(discountValue),
          minSubtotal: parseFloat(minSubtotal),
          maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
          startDate,
          endDate,
        },
      });

      setCoupons((prev) => [newCoupon, ...prev]);
      setSuccess(`Coupon "${newCoupon.code}" created successfully!`);
      setTimeout(() => setSuccess(''), 2500);

      // Clear Form & Close Drawer
      setCode('');
      setDescription('');
      setDiscountValue('');
      setMinSubtotal('0');
      setMaxDiscount('');
      setStartDate('');
      setEndDate('');
      setIsDrawerOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create coupon.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return <Loader size="lg" text="Loading coupons dashboard..." className="h-full w-full" />;
  }

  return (
    <div className="h-full w-full overflow-y-auto pb-8 pr-1 relative">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3.5 mb-6">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-coral-50 dark:bg-coral-950/20 text-coral-500">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50">Coupons & Promo Codes</h1>
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Manage custom restaurant discounts, flat and percentage rates</p>
          </div>
        </div>

        {user?.role === 'SUPER_ADMIN' && (
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-1.5 cursor-pointer rounded-lg bg-coral-500 hover:bg-coral-600 text-white font-black px-4 py-2.5 text-[10px] uppercase shadow-sm tracking-wide transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Create Coupon</span>
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900 p-3.5 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2 mb-4">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900 p-3.5 text-xs font-bold text-emerald-650 dark:text-emerald-400 flex items-center gap-2 mb-4 animate-pulse">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Coupons grid list */}
      {coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-zinc-250 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-950 text-zinc-400 mb-3">
            <Ticket className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No coupons active</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-[280px]">Create discounts to offer promotional prices to your customers during invoice checkouts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((coupon) => {
            const isExpired = new Date(coupon.endDate) < new Date();
            const statusLabel = isExpired ? 'Expired' : coupon.isActive ? 'Active' : 'Deactivated';

            return (
              <div 
                key={coupon.id} 
                className={`relative flex flex-col justify-between rounded-xl border p-4.5 bg-white dark:bg-zinc-900 shadow-xs transition-all ${
                  isExpired 
                    ? 'border-zinc-200 dark:border-zinc-850 opacity-60'
                    : coupon.isActive
                      ? 'border-zinc-200 dark:border-zinc-800 hover:border-coral-300 dark:hover:border-coral-800'
                      : 'border-zinc-200 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/50'
                }`}
              >
                {/* Details */}
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="inline-flex items-center gap-1 rounded bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-2 py-1 font-mono text-xs font-black tracking-wider text-zinc-850 dark:text-zinc-150">
                      {coupon.code}
                    </span>
                    
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                      isExpired
                        ? 'bg-zinc-100 dark:bg-zinc-950 text-zinc-500'
                        : coupon.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-150'
                          : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border border-amber-150'
                    }`}>
                      {statusLabel}
                    </span>
                  </div>

                  <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-50 mb-1">
                    {coupon.discountType === 'PERCENTAGE' 
                      ? `${coupon.discountValue}% OFF` 
                      : `₹${coupon.discountValue} FLAT OFF`
                    }
                  </h3>
                                   {coupon.description && (
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-350 leading-normal mb-3 font-semibold">
                      {coupon.description}
                    </p>
                  )}

                  <div className="space-y-1.5 border-t border-zinc-150 dark:border-zinc-800/80 pt-3 text-[10px] text-zinc-650 dark:text-zinc-400 font-semibold">
                    <div className="flex justify-between">
                      <span>Min Order Subtotal:</span>
                      <span className="font-black text-zinc-900 dark:text-zinc-100">₹{coupon.minSubtotal}</span>
                    </div>
                    {coupon.discountType === 'PERCENTAGE' && coupon.maxDiscount && (
                      <div className="flex justify-between">
                        <span>Max Cap Discount:</span>
                        <span className="font-black text-zinc-900 dark:text-zinc-100">₹{coupon.maxDiscount}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-2 font-bold">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      <span>
                        {new Date(coupon.startDate).toLocaleDateString()} - {new Date(coupon.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operations */}
                {user?.role === 'SUPER_ADMIN' && (
                  <div className="flex items-center justify-between border-t border-zinc-150 dark:border-zinc-850 pt-3 mt-4">
                    {isExpired ? (
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 select-none">
                        <ToggleLeft className="h-5 w-5 text-zinc-300 dark:text-zinc-800" />
                        <span>Expired</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggleActive(coupon.id, coupon.isActive)}
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:text-coral-500 transition-colors cursor-pointer"
                      >
                        {coupon.isActive ? (
                          <>
                            <ToggleRight className="h-5 w-5 text-emerald-500" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-5 w-5 text-zinc-400" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteCoupon(coupon.id)}
                      className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-450 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-950 transition-colors cursor-pointer"
                      title="Delete Coupon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE NEW DRAWER */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 h-full flex flex-col justify-between shadow-2xl transition-all duration-300">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-5">
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                  <Ticket className="h-4.5 w-4.5 text-coral-500" />
                  <span>Create Discount Coupon</span>
                </h3>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-150 dark:hover:bg-zinc-800 hover:text-zinc-650 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCoupon} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Coupon Code (Uppercase)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. MONSOON20"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 px-3 text-xs font-semibold outline-none focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Discount Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 20% off on monsoon bookings"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 px-3 text-xs font-semibold outline-none focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Discount Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => {
                        setDiscountType(e.target.value as 'PERCENTAGE' | 'FLAT');
                        setMaxDiscount('');
                      }}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 px-2 text-xs font-semibold outline-none focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FLAT">Flat (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Value</label>
                    <div className="relative">
                      <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-zinc-400 text-xs font-black">
                        {discountType === 'PERCENTAGE' ? '%' : '₹'}
                      </span>
                      <input 
                        type="number" 
                        step="1"
                        min="1"
                        placeholder="20"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3 pl-7 text-xs font-semibold outline-none focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Min Subtotal (₹)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={minSubtotal}
                      onChange={(e) => setMinSubtotal(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 px-3 text-xs font-semibold outline-none focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-450 mb-1.5 font-bold disabled:opacity-40">Max Cap (₹)</label>
                    <input 
                      type="number" 
                      min="1"
                      placeholder="Unlimited"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(e.target.value)}
                      disabled={discountType === 'FLAT'}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 px-3 text-xs font-semibold outline-none focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">Start Date</label>
                    <input 
                      type="date" 
                      value={startDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 px-3 text-xs font-semibold outline-none focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 mb-1.5 font-bold">End Date</label>
                    <input 
                      type="date" 
                      value={endDate}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 px-3 text-xs font-semibold outline-none focus:border-coral-500 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex-1 rounded-lg border border-zinc-250 dark:border-zinc-850 bg-white dark:bg-zinc-900 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 rounded-lg bg-coral-500 hover:bg-coral-600 text-white py-2.5 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {formLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : 'Publish Code'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
