'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePOSStore } from '@/store/usePOSStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useConfirmStore } from '@/store/useConfirmStore';
import { Order } from '@/types/pos';
import {
  Banknote, CreditCard, Receipt, CheckCircle, Printer, X,
  ShoppingBag, Trash2, Tag, Percent, Plus, Smartphone, Clock, Ban,
} from 'lucide-react';
import confettiExplosion from 'canvas-confetti';
import { Loader } from '@/components/Loader';
import { apiFetch } from '@/utils/api';
import { useCurrencySymbol } from '@/utils/currency';

const METHOD_OPTIONS: { key: 'CASH' | 'CARD' | 'UPI'; label: string; icon: React.ReactNode }[] = [
  { key: 'CASH', label: 'Cash', icon: <Banknote className="h-4 w-4" /> },
  { key: 'CARD', label: 'Card', icon: <CreditCard className="h-4 w-4" /> },
  { key: 'UPI', label: 'UPI', icon: <Smartphone className="h-4 w-4" /> },
];

function CheckoutContent() {
  const searchParams = useSearchParams();
  const preselectedOrderId = searchParams.get('orderId');

  const { activeOrders, completePayment, fetchActiveOrders, fetchMenuItems, cancelOrder, cancelOrderItem } = usePOSStore();
  const { user } = useAuthStore();
  const confirm = useConfirmStore((s) => s.confirm);
  const currencySymbol = useCurrencySymbol();
  const [cancellingItemId, setCancellingItemId] = useState<string | null>(null);
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<Order | null>(null);
  const [completedFilter, setCompletedFilter] = useState<'today' | 'yesterday' | '7days' | 'all'>('today');
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [loadingActive, setLoadingActive] = useState(false);

  const [restaurantSettings, setRestaurantSettings] = useState<{
    name: string; defaultTaxRate: number; defaultServiceCharge: number;
    address: string | null; phone: string | null; gstin: string | null;
    logo: string | null; thankYouMessage: string | null;
  } | null>(null);

  const [localPayments, setLocalPayments] = useState<{ paymentMethod: 'CASH' | 'CARD' | 'UPI'; amount: number; transactionReference?: string }[]>([]);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [manualDiscountInput, setManualDiscountInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);

  React.useEffect(() => {
    apiFetch<any>('/auth/restaurant').then(setRestaurantSettings).catch(() => {});
  }, []);

  React.useEffect(() => {
    setLoadingActive(true);
    setLoadingCompleted(true);
    fetchMenuItems().then(() => {
      fetchActiveOrders(true, completedFilter).finally(() => {
        setLoadingActive(false);
        setLoadingCompleted(false);
      });
    });
    const interval = setInterval(() => fetchActiveOrders(true, completedFilter), 5000);
    return () => clearInterval(interval);
  }, [fetchActiveOrders, fetchMenuItems, completedFilter]);

  React.useEffect(() => {
    if (!selectedOrderForBill) return;
    const updated = activeOrders.find((o) => o.id === selectedOrderForBill.id);
    if (!updated) return;
    // Only swap the reference when something meaningful changed — avoids blinking on every poll
    const changed =
      updated.status !== selectedOrderForBill.status ||
      updated.totals.total !== selectedOrderForBill.totals.total ||
      updated.items.length !== selectedOrderForBill.items.length ||
      updated.payments?.length !== selectedOrderForBill.payments?.length;
    if (changed) setSelectedOrderForBill(updated);
  }, [activeOrders, selectedOrderForBill?.id]);

  // Auto-select order when navigated from the orders list with ?orderId=
  // Skip PAID orders — opening their invoice automatically is disruptive
  React.useEffect(() => {
    if (!preselectedOrderId || activeOrders.length === 0) return;
    const target = activeOrders.find(o => o.id === preselectedOrderId && o.status !== 'PAID');
    if (target && !selectedOrderForBill) setSelectedOrderForBill(target);
  }, [preselectedOrderId, activeOrders]);

  React.useEffect(() => {
    if (selectedOrderForBill) {
      setCouponCodeInput(selectedOrderForBill.couponCode || '');
      setManualDiscountInput(parseFloat(selectedOrderForBill.totals.discount) > 0 ? selectedOrderForBill.totals.discount : '');
      setLocalPayments([]);
      setCouponError('');
      setCouponSuccess('');
      setShowMobileReceipt(false);
      const alreadyPaid = selectedOrderForBill.payments?.reduce((s, p) => s + p.amount, 0) || 0;
      const rem = Math.max(0, parseFloat(selectedOrderForBill.totals.total) - alreadyPaid);
      setPaymentAmountInput(rem > 0 ? rem.toFixed(2) : '');
    } else {
      setCouponCodeInput(''); setManualDiscountInput(''); setLocalPayments([]);
      setCouponError(''); setCouponSuccess(''); setPaymentAmountInput('');
    }
  }, [selectedOrderForBill?.id]);

  const readyOrders = useMemo(() =>
    activeOrders.filter(o => o.status === 'READY' || o.status === 'BILL_REQUESTED' || o.status === 'PARTIALLY_PAID'),
    [activeOrders]);

  const completedOrders = useMemo(() =>
    activeOrders.filter(o => o.status === 'PAID'),
    [activeOrders]);

  const alreadyPaid = useMemo(() =>
    selectedOrderForBill?.payments?.reduce((s, p) => s + p.amount, 0) || 0,
    [selectedOrderForBill?.payments]);

  const localPaid = useMemo(() => localPayments.reduce((s, p) => s + p.amount, 0), [localPayments]);
  const totalPaid = alreadyPaid + localPaid;

  const remainingBalance = useMemo(() => {
    if (!selectedOrderForBill) return 0;
    return Math.max(0, parseFloat(selectedOrderForBill.totals.total) - totalPaid);
  }, [selectedOrderForBill?.totals?.total, totalPaid]);

  React.useEffect(() => {
    if (selectedOrderForBill) setPaymentAmountInput(remainingBalance > 0 ? remainingBalance.toFixed(2) : '');
  }, [remainingBalance, selectedOrderForBill?.id]);

  const handleAddPayment = () => {
    const amt = parseFloat(paymentAmountInput);
    if (isNaN(amt) || amt <= 0) return;
    setLocalPayments([...localPayments, { paymentMethod: paymentMethodInput, amount: amt, transactionReference: paymentRefInput || undefined }]);
    setPaymentRefInput('');
  };

  const handleRemovePayment = (i: number) => setLocalPayments(localPayments.filter((_, idx) => idx !== i));

  const handleApplyDiscountAndCoupon = async () => {
    if (!selectedOrderForBill) return;
    setCouponError(''); setCouponSuccess('');
    const discountVal = manualDiscountInput ? parseFloat(manualDiscountInput) : 0;
    if (manualDiscountInput) {
      if (isNaN(discountVal) || discountVal < 0) { setCouponError('Discount must be a valid positive number.'); return; }
      if (discountVal > parseFloat(selectedOrderForBill.totals.subtotal)) { setCouponError('Discount cannot exceed subtotal.'); return; }
    }
    setLoadingDiscounts(true);
    try {
      await completePayment(selectedOrderForBill.id, { couponCode: couponCodeInput || undefined, manualDiscount: manualDiscountInput ? discountVal : undefined, payments: [] });
      setCouponSuccess('Discount applied!');
    } catch (err: any) { setCouponError(err.message || 'Failed to apply discount.'); }
    finally { setLoadingDiscounts(false); }
  };

  const handleFinalizeCheckout = async () => {
    if (!selectedOrderForBill) return;
    setCouponError(''); setCouponSuccess('');
    const discountVal = manualDiscountInput ? parseFloat(manualDiscountInput) : 0;
    if (manualDiscountInput) {
      if (isNaN(discountVal) || discountVal < 0) { setCouponError('Discount must be a valid positive number.'); return; }
      if (discountVal > parseFloat(selectedOrderForBill.totals.subtotal)) { setCouponError('Discount cannot exceed subtotal.'); return; }
    }
    setPayingOrderId(selectedOrderForBill.id);
    try {
      let finalPayments = [...localPayments];
      if (finalPayments.length === 0 && remainingBalance > 0) {
        finalPayments = [{ paymentMethod: paymentMethodInput, amount: remainingBalance, transactionReference: paymentRefInput || undefined }];
      }
      await completePayment(selectedOrderForBill.id, { couponCode: couponCodeInput || undefined, manualDiscount: manualDiscountInput ? discountVal : undefined, payments: finalPayments });
      const paidAfter = alreadyPaid + finalPayments.reduce((s, p) => s + p.amount, 0);
      if (paidAfter >= parseFloat(selectedOrderForBill.totals.total)) {
        confettiExplosion({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#f97316', '#10b981', '#3b82f6', '#f59e0b'] });
        setCouponSuccess('Order fully paid!');
        setTimeout(() => triggerPrint(), 800);
      } else {
        setCouponSuccess('Partial payment recorded!');
      }
      setLocalPayments([]);
    } catch (err: any) { setCouponError(err.message || 'Failed to finalize checkout.'); }
    finally { setPayingOrderId(null); }
  };

  const triggerPrint = () => {
    const source = document.getElementById('thermal-receipt-print-area');
    if (!source) return;
    const portal = document.createElement('div');
    portal.id = 'receipt-print-portal';
    portal.innerHTML = source.innerHTML;
    document.body.appendChild(portal);
    const cleanup = () => { if (document.body.contains(portal)) document.body.removeChild(portal); window.onafterprint = null; };
    window.onafterprint = cleanup;
    window.print();
    setTimeout(cleanup, 3000);
  };

  const [showMobileReceipt, setShowMobileReceipt] = useState(false);

  const checkoutButtonText = useMemo(() => {
    if (payingOrderId !== null) return 'SAVING...';
    if (localPayments.length === 0) return remainingBalance > 0 ? `CHARGE ${currencySymbol}${remainingBalance.toFixed(2)} (${paymentMethodInput})` : 'SAVE CHANGES';
    return remainingBalance === 0 ? 'COMPLETE CHECKOUT' : 'SAVE PARTIAL PAYMENTS';
  }, [payingOrderId, localPayments.length, remainingBalance, paymentMethodInput, currencySymbol]);

  const handleCancelOrder = (order: Order) => {
    confirm({
      title: 'Cancel Order',
      message: `Cancel order ${order.orderNumber}${order.table ? ` (${order.table.name})` : ''}? This cannot be undone.`,
      type: 'danger',
      confirmText: 'Cancel Order',
      onConfirm: async () => {
        await cancelOrder(order.id);
        if (selectedOrderForBill?.id === order.id) setSelectedOrderForBill(null);
      },
    });
  };

  const handleCancelItem = (orderId: string, itemId: string, itemName: string) => {
    confirm({
      title: 'Cancel Item',
      message: `Remove "${itemName}" from this order? The order total will be recalculated.`,
      type: 'warning',
      confirmText: 'Remove Item',
      onConfirm: async () => {
        setCancellingItemId(itemId);
        try {
          await cancelOrderItem(orderId, itemId);
        } finally {
          setCancellingItemId(null);
        }
      },
    });
  };

  const getStatusStyle = (status: string) => {
    if (status === 'READY') return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    if (status === 'BILL_REQUESTED') return 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    if (status === 'PARTIALLY_PAID') return 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 border-zinc-200 dark:border-zinc-700';
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-3 overflow-y-auto lg:overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: 80mm auto; margin: 0mm; }
          body { background: white !important; color: black !important; margin: 0 !important; padding: 0 !important; }
          body > *:not(#receipt-print-portal) { display: none !important; }
          #receipt-print-portal {
            display: block !important; position: absolute !important; left: 0 !important; top: 0 !important;
            width: 80mm !important; margin: 0 !important; padding: 4mm !important;
            box-sizing: border-box !important; font-family: 'Courier New', Courier, monospace !important;
            font-size: 11px !important; color: black !important; background: white !important;
          }
        }
      `}} />

      {/* ── LEFT: Ready for checkout ── */}
      <div className="flex w-full lg:w-[55%] flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden shrink-0">
        <div className="flex items-center gap-2.5 border-b border-orange-600 bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-3">
          <ShoppingBag className="h-4 w-4 text-white" />
          <h2 className="text-xs font-black uppercase tracking-wider text-white">Ready for Checkout</h2>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-black text-white">{readyOrders.length}</span>
        </div>

        <div className="relative flex-1 overflow-y-auto p-3 space-y-2.5">
          {loadingActive && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm">
              <Loader size="md" text="Syncing queue..." />
            </div>
          )}
          {readyOrders.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center">
              <CheckCircle className="h-10 w-10 stroke-[1.2] text-zinc-300" />
              <p className="text-xs font-bold text-zinc-500">No pending payments</p>
              <p className="text-[10px] text-zinc-400 max-w-[200px]">Orders marked ready in KDS will appear here.</p>
            </div>
          ) : (
            readyOrders.map((order) => (
              <div key={order.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Card header */}
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                      #{order.orderNumber}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold">
                      {order.table ? order.table.name : 'Takeaway'}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase ${getStatusStyle(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Clock className="h-3 w-3 text-zinc-400" />
                    <span className="text-[10px] font-bold text-zinc-400">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="px-3 py-2 space-y-0.5">
                  {order.items.map((item) => {
                    const isCancelled = item.status === 'CANCELLED';
                    return (
                      <div key={item.id ?? item.menuItem.id} className={`flex items-center justify-between text-[11px] gap-1 group ${isCancelled ? 'opacity-50' : ''}`}>
                        <span className={`flex-1 min-w-0 font-semibold ${isCancelled ? 'line-through text-zinc-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                          {item.menuItem.name} <span className="text-zinc-400">×{item.quantity}</span>
                          {isCancelled && <span className="ml-1 text-[9px] font-black text-red-400 uppercase">cancelled</span>}
                        </span>
                        <span className={`font-bold shrink-0 ${isCancelled ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                          {currencySymbol}{(item.menuItem.price * item.quantity).toFixed(2)}
                        </span>
                        {!isCancelled && item.id && (
                          <button
                            onClick={() => handleCancelItem(order.id, item.id!, item.menuItem.name)}
                            disabled={cancellingItemId === item.id}
                            className="opacity-0 group-hover:opacity-100 ml-1 shrink-0 rounded p-0.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-30"
                            title="Cancel this item"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-3 py-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-orange-500">
                      {currencySymbol}{order.totals.total}
                    </span>
                    <button
                      onClick={() => handleCancelOrder(order)}
                      className="flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 px-2 py-1.5 text-[10px] font-black text-red-600 dark:text-red-400 transition-all cursor-pointer"
                      title="Cancel Order"
                    >
                      <Ban className="h-3 w-3" />CANCEL
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedOrderForBill(order)}
                    className="flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-[0.98] px-4 py-2 text-[11px] font-black text-white transition-all shadow-sm shadow-orange-200 cursor-pointer"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    CHECKOUT
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Completed orders ── */}
      <div className="flex w-full lg:w-[45%] flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden shrink-0">
        <div className="flex items-center justify-between border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-black uppercase tracking-wider text-white">Completed</h2>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/15 px-1 text-[10px] font-black text-white">{completedOrders.length}</span>
          </div>
          <select
            value={completedFilter}
            onChange={(e) => setCompletedFilter(e.target.value as any)}
            className="rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-1 text-[10px] font-black outline-none focus:border-orange-400 cursor-pointer text-zinc-100"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>

        <div className="relative flex-1 overflow-y-auto p-3 space-y-2">
          {loadingCompleted && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm">
              <Loader size="md" text="Syncing history..." />
            </div>
          )}
          {completedOrders.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <Receipt className="h-10 w-10 stroke-[1.2] text-zinc-300" />
              <p className="text-xs font-bold text-zinc-500">No completed orders</p>
            </div>
          ) : (
            completedOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">#{order.orderNumber}</span>
                    <span className="text-[10px] text-zinc-500 font-bold">{order.table ? order.table.name : 'Takeaway'}</span>
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 text-[8px] font-black text-emerald-700 dark:text-emerald-400 uppercase">PAID</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-zinc-400">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <span className="mx-1">·</span>
                    <span className="font-black text-zinc-700 dark:text-zinc-300">{currencySymbol}{order.totals.total}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrderForBill(order)}
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:border-orange-300 hover:text-orange-500 px-2.5 py-1.5 text-[10px] font-black text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />REPRINT
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Checkout Modal ── */}
      {selectedOrderForBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`relative flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full ${selectedOrderForBill.status === 'PAID' ? 'max-w-sm' : 'max-w-4xl'} max-h-[92vh] overflow-hidden`}>

            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Receipt className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  {selectedOrderForBill.status === 'PAID' ? 'Invoice Preview' : `Order #${selectedOrderForBill.orderNumber} · ${selectedOrderForBill.table?.name || 'Takeaway'}`}
                </span>
              </div>
              <button onClick={() => setSelectedOrderForBill(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-100 transition-all cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">

                {/* ── LEFT PANEL: Payment editor (only for non-paid orders) ── */}
                {selectedOrderForBill.status !== 'PAID' && (
                  <div className="flex-1 md:flex-none md:w-[340px] flex flex-col border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">

                    {/* Balance summary — TOP of panel, always visible */}
                    <div className="bg-zinc-900 dark:bg-zinc-950 px-4 py-4 space-y-2 shrink-0">
                      <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                        <span>Grand Total</span>
                        <span className="text-white font-black">{currencySymbol}{selectedOrderForBill.totals.total}</span>
                      </div>
                      {alreadyPaid > 0 && (
                        <div className="flex justify-between text-[10px] font-bold text-emerald-400">
                          <span>Already Paid</span>
                          <span>{currencySymbol}{alreadyPaid.toFixed(2)}</span>
                        </div>
                      )}
                      {localPaid > 0 && (
                        <div className="flex justify-between text-[10px] font-bold text-blue-400">
                          <span>Pending (this session)</span>
                          <span>{currencySymbol}{localPaid.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center border-t border-zinc-700 pt-2">
                        <span className="text-xs font-black text-zinc-300">Remaining</span>
                        <span className={`text-xl font-black ${remainingBalance === 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                          {currencySymbol}{remainingBalance.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">

                      {/* Payment method selector */}
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Payment Method</p>
                        <div className="grid grid-cols-3 gap-2">
                          {METHOD_OPTIONS.map((m) => (
                            <button key={m.key} onClick={() => setPaymentMethodInput(m.key)}
                              className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-3 text-[11px] font-black transition-all cursor-pointer ${
                                paymentMethodInput === m.key
                                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/20 text-orange-500'
                                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
                              }`}>
                              {m.icon}
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Amount + add to split */}
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Amount</p>
                        <div className="flex gap-2">
                          <input type="number" step="0.01" placeholder="0.00" value={paymentAmountInput}
                            onChange={(e) => setPaymentAmountInput(e.target.value)}
                            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm font-black outline-none focus:border-orange-400 dark:text-zinc-100" />
                          <button onClick={handleAddPayment}
                            className="flex items-center gap-1 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-700 text-white px-3 text-[11px] font-black transition-all cursor-pointer">
                            <Plus className="h-3.5 w-3.5" />SPLIT
                          </button>
                        </div>
                        <input type="text" placeholder="Reference / UTR / Last 4 digits (optional)" value={paymentRefInput}
                          onChange={(e) => setPaymentRefInput(e.target.value)}
                          className="mt-2 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-[10px] font-bold outline-none focus:border-orange-400 dark:text-zinc-100" />
                      </div>

                      {/* Pending split payments */}
                      {(selectedOrderForBill.payments?.length || 0) > 0 || localPayments.length > 0 ? (
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Payments</p>
                          {selectedOrderForBill.payments?.map((p, i) => (
                            <div key={p.id || i} className="flex justify-between items-center rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-[11px]">
                              <span className="font-bold text-zinc-600 dark:text-zinc-400 uppercase">{p.paymentMethod}{p.transactionReference ? ` · ${p.transactionReference}` : ''}</span>
                              <span className="font-black text-emerald-600 dark:text-emerald-400">{currencySymbol}{p.amount.toFixed(2)}</span>
                            </div>
                          ))}
                          {localPayments.map((p, i) => (
                            <div key={i} className="flex justify-between items-center rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 px-3 py-2 text-[11px]">
                              <span className="font-bold text-orange-700 dark:text-orange-400 uppercase">{p.paymentMethod}{p.transactionReference ? ` · ${p.transactionReference}` : ''}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-orange-700 dark:text-orange-400">{currencySymbol}{p.amount.toFixed(2)}</span>
                                <button onClick={() => handleRemovePayment(i)} className="text-zinc-400 hover:text-red-500 cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {/* Discounts */}
                      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                          <Tag className="h-3 w-3 text-orange-500" />Discounts & Coupons
                        </p>
                        <div className="relative">
                          <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                          <input type="number" step="0.01" placeholder="Manual discount amount" value={manualDiscountInput}
                            onChange={(e) => setManualDiscountInput(e.target.value)}
                            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2 pl-8 pr-3 text-xs font-bold outline-none focus:border-orange-400 dark:text-zinc-100" />
                        </div>
                        <div className="relative">
                          <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                          <input type="text" placeholder="Coupon code (e.g. WELCOME10)" value={couponCodeInput}
                            onChange={(e) => setCouponCodeInput(e.target.value)}
                            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2 pl-8 pr-3 text-xs font-bold outline-none focus:border-orange-400 uppercase dark:text-zinc-100" />
                        </div>
                        <button onClick={handleApplyDiscountAndCoupon} disabled={loadingDiscounts}
                          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 py-2 text-[11px] font-black text-zinc-600 dark:text-zinc-400 hover:border-orange-300 hover:text-orange-500 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5">
                          {loadingDiscounts ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" /> : null}
                          APPLY DISCOUNT / COUPON
                        </button>
                        {couponError && <p className="text-[10px] font-bold text-red-500">{couponError}</p>}
                        {couponSuccess && <p className="text-[10px] font-bold text-emerald-500">{couponSuccess}</p>}
                      </div>
                    </div>

                    {/* Finalize button — sticky at bottom of left panel */}
                    <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 shrink-0 space-y-2">
                      <button
                        onClick={() => setShowMobileReceipt(v => !v)}
                        className="md:hidden w-full rounded-xl border border-zinc-200 dark:border-zinc-800 py-2 text-[11px] font-black text-zinc-500 dark:text-zinc-400 hover:border-orange-300 hover:text-orange-500 transition-all cursor-pointer flex items-center justify-center gap-1.5">
                        <Receipt className="h-3.5 w-3.5" />
                        {showMobileReceipt ? 'HIDE RECEIPT' : 'VIEW RECEIPT'}
                      </button>
                      <button onClick={handleFinalizeCheckout} disabled={payingOrderId !== null}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] py-3.5 text-xs font-black text-white transition-all shadow-md shadow-emerald-200 dark:shadow-none disabled:opacity-50 cursor-pointer">
                        {payingOrderId ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <CheckCircle className="h-4 w-4" />}
                        {checkoutButtonText}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── RIGHT PANEL: Thermal receipt preview ── */}
                <div className={`flex-1 overflow-y-auto bg-zinc-100 dark:bg-zinc-950/60 p-4 justify-center md:flex ${showMobileReceipt ? 'flex' : 'hidden'}`}>
                  <div
                    id="thermal-receipt-print-area"
                    className="w-full max-w-[80mm] bg-white border border-zinc-300 shadow-sm p-4 text-zinc-950 font-mono text-[11px] leading-relaxed"
                    style={{ fontFamily: 'Courier New, Courier, monospace' }}
                  >
                    <div className="text-center space-y-1">
                      {restaurantSettings?.logo && (
                        <div className="mb-1">
                          {restaurantSettings.logo.startsWith('http')
                            ? <img src={restaurantSettings.logo} alt="logo" className="mx-auto h-8 object-contain" />
                            : <span className="text-base">{restaurantSettings.logo}</span>}
                        </div>
                      )}
                      <h3 className="text-sm font-extrabold tracking-wide uppercase">
                        {restaurantSettings?.name || user?.restaurantName || 'KHAOPIO RESTAURANT'}
                      </h3>
                      <p className="text-[10px] text-zinc-600">{restaurantSettings?.address || '123 Agentic Way, Silicon Valley'}</p>
                      <p className="text-[10px] text-zinc-600">PH: {restaurantSettings?.phone || '+1 (555) 019-9000'}</p>
                      {restaurantSettings?.gstin && <p className="text-[9px] font-bold uppercase tracking-wider">GSTIN: {restaurantSettings.gstin}</p>}
                      <div className={`inline-block font-extrabold text-[9px] px-2 py-0.5 rounded border uppercase tracking-widest mt-1 ${
                        selectedOrderForBill.status === 'PAID' ? 'bg-zinc-100 text-zinc-800 border-zinc-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {selectedOrderForBill.status === 'PAID' ? 'TAX INVOICE' : 'ESTIMATE / PRE-BILL'}
                      </div>
                    </div>

                    <div className="my-2 border-t border-dashed border-zinc-900" />

                    <div className="space-y-0.5 text-[10px]">
                      <div className="flex justify-between">
                        <span>DATE: {new Date(selectedOrderForBill.createdAt).toLocaleDateString()}</span>
                        <span>TIME: {new Date(selectedOrderForBill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div>ORDER NO: {selectedOrderForBill.orderNumber}</div>
                      <div>TABLE: {selectedOrderForBill.table ? selectedOrderForBill.table.name.toUpperCase() : 'TAKEAWAY'}</div>
                      <div>INVOICE ID: INV-{selectedOrderForBill.id.split('-')[0]?.toUpperCase()}</div>
                      <div>PAY STATUS: <span className="font-extrabold">{selectedOrderForBill.status.replace('_', ' ')}</span></div>
                      <div>SERVED BY: {selectedOrderForBill.waiterName?.toUpperCase()} ({selectedOrderForBill.waiterRole?.replace('_', ' ').toUpperCase()})</div>
                      <div>CASHIER: {user?.name.toUpperCase()} ({user?.role.replace('_', ' ').toUpperCase()})</div>
                    </div>

                    <div className="my-2 border-t border-dashed border-zinc-900" />

                    <div className="grid grid-cols-12 font-extrabold mb-1 text-[10px]">
                      <span className="col-span-6">ITEM</span>
                      <span className="col-span-2 text-center">QTY</span>
                      <span className="col-span-4 text-right">AMT</span>
                    </div>
                    <div className="my-1 border-t border-dashed border-zinc-400" />

                    <div className="space-y-1">
                      {selectedOrderForBill.items.map((item) => (
                        <div key={item.menuItem.id} className="grid grid-cols-12 text-[10px]">
                          <span className="col-span-6 truncate uppercase">{item.menuItem.name}</span>
                          <span className="col-span-2 text-center">{item.quantity}</span>
                          <span className="col-span-4 text-right">{currencySymbol}{(item.menuItem.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="my-2 border-t border-dashed border-zinc-900" />

                    <div className="space-y-0.5 text-[10px]">
                      <div className="flex justify-between"><span>SUBTOTAL:</span><span>{currencySymbol}{selectedOrderForBill.totals.subtotal}</span></div>
                      {parseFloat(selectedOrderForBill.totals.discount) > 0 && (
                        <>
                          <div className="flex justify-between text-red-700">
                            <span>DISCOUNT {selectedOrderForBill.couponCode ? `(${selectedOrderForBill.couponCode})` : '(MANUAL)'}:</span>
                            <span>-{currencySymbol}{parseFloat(selectedOrderForBill.totals.discount).toFixed(2)}</span>
                          </div>
                          <div className="my-0.5 border-t border-dashed border-zinc-300" />
                          <div className="flex justify-between font-extrabold">
                            <span>AFTER DISCOUNT:</span>
                            <span>{currencySymbol}{(parseFloat(selectedOrderForBill.totals.subtotal) - parseFloat(selectedOrderForBill.totals.discount)).toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      {parseFloat(selectedOrderForBill.totals.serviceCharge) > 0 && (
                        <div className="flex justify-between">
                          <span>SERVICE CHARGE @ {parseFloat(selectedOrderForBill.totals.serviceChargeRate)}%:</span>
                          <span>{currencySymbol}{parseFloat(selectedOrderForBill.totals.serviceCharge).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>CGST @ {(parseFloat(selectedOrderForBill.totals.taxRate) / 2).toFixed(1)}%:</span>
                        <span>{currencySymbol}{(parseFloat(selectedOrderForBill.totals.tax) / 2).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST @ {(parseFloat(selectedOrderForBill.totals.taxRate) / 2).toFixed(1)}%:</span>
                        <span>{currencySymbol}{(parseFloat(selectedOrderForBill.totals.tax) / 2).toFixed(2)}</span>
                      </div>
                      <div className="my-1 border-t border-dashed border-zinc-400" />
                      <div className="flex justify-between font-black text-xs"><span>TOTAL:</span><span>{currencySymbol}{selectedOrderForBill.totals.total}</span></div>
                      {selectedOrderForBill.payments && selectedOrderForBill.payments.length > 0 && (
                        <>
                          <div className="my-1.5 border-t border-dashed border-zinc-400" />
                          <div className="font-extrabold uppercase mb-0.5">TRANSACTIONS:</div>
                          {selectedOrderForBill.payments.map((p, i) => (
                            <div key={p.id || i} className="flex justify-between">
                              <span className="uppercase text-[9px]">- {p.paymentMethod}{p.transactionReference ? ` (${p.transactionReference})` : ''}:</span>
                              <span>{currencySymbol}{p.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    <div className="my-2 border-t border-dashed border-zinc-900" />

                    <div className="text-center space-y-1 mt-3">
                      <p className="text-[10px] font-bold uppercase">{restaurantSettings?.thankYouMessage || 'THANK YOU FOR DINING WITH US!'}</p>
                      <p className="text-[9px] text-zinc-500 italic">Powered by KhaoPio POS</p>
                      <div className="flex flex-col items-center pt-2">
                        <div className="flex h-7 bg-zinc-950 w-32 items-stretch justify-around px-2.5">
                          {[1,2,1,3,1,2,1,4,2,1,3].map((w, i) => <span key={i} style={{ width: `${w}px` }} className="bg-white" />)}
                        </div>
                        <span className="text-[7px] text-zinc-500 tracking-[0.2em] mt-0.5">*{selectedOrderForBill.id.substring(0, 8).toUpperCase()}*</span>
                      </div>
                    </div>
                  </div>
                </div>

            </div>

            {/* Modal footer */}
            <div className="flex gap-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3">
              <button onClick={() => setSelectedOrderForBill(null)}
                className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 py-2.5 text-xs font-black text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                CLOSE
              </button>
              <button onClick={triggerPrint}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-700 dark:hover:bg-zinc-700 py-2.5 text-xs font-black text-white transition-colors cursor-pointer">
                <Printer className="h-4 w-4" />PRINT INVOICE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader size="lg" text="Loading Checkout..." />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
