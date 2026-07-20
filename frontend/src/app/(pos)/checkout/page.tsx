'use client';

import React, { useState, useMemo } from 'react';
import { usePOSStore } from '@/store/usePOSStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Order } from '@/types/pos';
import { Banknote, CreditCard, Receipt, CheckCircle, Printer, X, ShoppingBag, Trash2, Tag, Percent, Plus } from 'lucide-react';
import confettiExplosion from 'canvas-confetti';
import { Loader } from '@/components/Loader';
import { apiFetch } from '@/utils/api';

export default function CheckoutPage() {
  const { activeOrders, completePayment, fetchActiveOrders, fetchMenuItems } = usePOSStore();
  const { user } = useAuthStore();
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<Order | null>(null);
  const [completedFilter, setCompletedFilter] = useState<'today' | 'yesterday' | '7days' | 'all'>('today');
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [loadingActive, setLoadingActive] = useState(false);

  // Restaurant settings state for invoice header/footer styling
  const [restaurantSettings, setRestaurantSettings] = useState<{
    name: string;
    defaultTaxRate: number;
    defaultServiceCharge: number;
    address: string | null;
    phone: string | null;
    gstin: string | null;
    logo: string | null;
    thankYouMessage: string | null;
  } | null>(null);

  // Local checkout inputs
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

  // Fetch restaurant configuration on mount
  React.useEffect(() => {
    apiFetch<any>('/auth/restaurant')
      .then((data: any) => {
        setRestaurantSettings(data);
      })
      .catch((err: any) => {
        console.error('Failed to load restaurant settings for checkout print:', err);
      });
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
    const interval = setInterval(() => {
      fetchActiveOrders(true, completedFilter);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchActiveOrders, fetchMenuItems, completedFilter]);

  // Synchronize selectedOrderForBill with reactive activeOrders list from store
  React.useEffect(() => {
    if (selectedOrderForBill) {
      const updated = activeOrders.find((o) => o.id === selectedOrderForBill.id);
      if (updated) {
        setSelectedOrderForBill(updated);
      }
    }
  }, [activeOrders, selectedOrderForBill?.id]);

  // Reset local states when active order selection changes
  React.useEffect(() => {
    if (selectedOrderForBill) {
      setCouponCodeInput(selectedOrderForBill.couponCode || '');
      setManualDiscountInput(parseFloat(selectedOrderForBill.totals.discount) > 0 ? selectedOrderForBill.totals.discount : '');
      setLocalPayments([]);
      setCouponError('');
      setCouponSuccess('');
      
      const alreadyPaid = selectedOrderForBill.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const rem = Math.max(0, parseFloat(selectedOrderForBill.totals.total) - alreadyPaid);
      setPaymentAmountInput(rem > 0 ? rem.toFixed(2) : '');
    } else {
      setCouponCodeInput('');
      setManualDiscountInput('');
      setLocalPayments([]);
      setCouponError('');
      setCouponSuccess('');
      setPaymentAmountInput('');
    }
  }, [selectedOrderForBill?.id]);

  // Filter orders with READY/BILL_REQUESTED/PARTIALLY_PAID status for active queue
  const readyOrders = useMemo(() => {
    return activeOrders.filter((order) => order.status === 'READY' || order.status === 'BILL_REQUESTED' || order.status === 'PARTIALLY_PAID');
  }, [activeOrders]);

  // Filter completed/PAID orders
  const completedOrders = useMemo(() => {
    return activeOrders.filter((order) => order.status === 'PAID');
  }, [activeOrders]);

  // Compute total paid so far
  const alreadyPaid = useMemo(() => {
    return selectedOrderForBill?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  }, [selectedOrderForBill?.payments]);

  const localPaid = useMemo(() => {
    return localPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [localPayments]);

  const totalPaid = alreadyPaid + localPaid;

  const remainingBalance = useMemo(() => {
    if (!selectedOrderForBill) return 0;
    return Math.max(0, parseFloat(selectedOrderForBill.totals.total) - totalPaid);
  }, [selectedOrderForBill?.totals?.total, totalPaid]);

  // Dynamically update the default payment amount input
  React.useEffect(() => {
    if (selectedOrderForBill) {
      setPaymentAmountInput(remainingBalance > 0 ? remainingBalance.toFixed(2) : '');
    }
  }, [remainingBalance, selectedOrderForBill?.id]);

  // Add a split payment locally
  const handleAddPayment = () => {
    const amt = parseFloat(paymentAmountInput);
    if (isNaN(amt) || amt <= 0) return;
    
    setLocalPayments([...localPayments, {
      paymentMethod: paymentMethodInput,
      amount: amt,
      transactionReference: paymentRefInput || undefined
    }]);
    setPaymentRefInput('');
  };

  // Remove a local split payment
  const handleRemovePayment = (index: number) => {
    setLocalPayments(localPayments.filter((_, i) => i !== index));
  };

  // Recalculate and apply coupon / manual discount on backend
  const handleApplyDiscountAndCoupon = async () => {
    if (!selectedOrderForBill) return;
    setCouponError('');
    setCouponSuccess('');

    const discountVal = manualDiscountInput ? parseFloat(manualDiscountInput) : 0;
    if (manualDiscountInput) {
      if (isNaN(discountVal) || discountVal < 0) {
        setCouponError('Manual discount must be a valid positive number.');
        return;
      }
      const orderSubtotal = parseFloat(selectedOrderForBill.totals.subtotal) || 0;
      if (discountVal > orderSubtotal) {
        setCouponError('Manual discount cannot exceed the order subtotal.');
        return;
      }
    }

    setLoadingDiscounts(true);
    try {
      await completePayment(selectedOrderForBill.id, {
        couponCode: couponCodeInput || undefined,
        manualDiscount: manualDiscountInput ? discountVal : undefined,
        payments: []
      });
      setCouponSuccess('Discount / Coupon applied successfully!');
    } catch (err: any) {
      setCouponError(err.message || 'Failed to apply discount/coupon.');
    } finally {
      setLoadingDiscounts(false);
    }
  };

  // Finalize payment transaction
  const handleFinalizeCheckout = async () => {
    if (!selectedOrderForBill) return;
    setCouponError('');
    setCouponSuccess('');

    const discountVal = manualDiscountInput ? parseFloat(manualDiscountInput) : 0;
    if (manualDiscountInput) {
      if (isNaN(discountVal) || discountVal < 0) {
        setCouponError('Manual discount must be a valid positive number.');
        return;
      }
      const orderSubtotal = parseFloat(selectedOrderForBill.totals.subtotal) || 0;
      if (discountVal > orderSubtotal) {
        setCouponError('Manual discount cannot exceed the order subtotal.');
        return;
      }
    }

    setPayingOrderId(selectedOrderForBill.id);
    try {
      let finalPayments = [...localPayments];

      // If split builder is empty but there's a remaining balance,
      // default to paying the full remaining balance using the selected inputs
      if (finalPayments.length === 0 && remainingBalance > 0) {
        finalPayments = [{
          paymentMethod: paymentMethodInput,
          amount: remainingBalance,
          transactionReference: paymentRefInput || undefined
        }];
      }

      await completePayment(selectedOrderForBill.id, {
        couponCode: couponCodeInput || undefined,
        manualDiscount: manualDiscountInput ? discountVal : undefined,
        payments: finalPayments
      });

      const totalPaidAfter = alreadyPaid + finalPayments.reduce((sum, p) => sum + p.amount, 0);
      const grandTotalAfter = parseFloat(selectedOrderForBill.totals.total);
      if (totalPaidAfter >= grandTotalAfter) {
        confettiExplosion({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#f97316', '#10b981', '#3b82f6', '#f59e0b'],
        });
        setCouponSuccess('Order fully paid and checkout completed!');
        
        // Auto launch browser native print screen pre-formatted specifically for rolls
        setTimeout(() => {
          window.print();
        }, 800);
      } else {
        setCouponSuccess('Partial payment recorded successfully!');
      }

      setLocalPayments([]);
    } catch (err: any) {
      setCouponError(err.message || 'Failed to finalize checkout.');
    } finally {
      setPayingOrderId(null);
    }
  };

  const handlePrintAction = () => {
    window.print();
  };

  // Compute checkout button text dynamically
  const checkoutButtonText = useMemo(() => {
    if (payingOrderId !== null) return 'SAVING...';
    if (localPayments.length === 0) {
      if (remainingBalance > 0) {
        return `FINALIZE PAYMENT (${paymentMethodInput})`;
      }
      return 'SAVE DISCOUNTS / UPDATE';
    }
    return remainingBalance === 0 ? 'FINALIZE CHECKOUT' : 'SAVE PARTIAL PAYMENTS';
  }, [payingOrderId, localPayments.length, remainingBalance, paymentMethodInput]);

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-3 overflow-y-auto lg:overflow-hidden">
      {/* Print-only CSS style injection (Bulletproof selective rendering) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide everything by default */
          body * {
            visibility: hidden !important;
          }
          /* Make the print preview layout and all children visible */
          #thermal-receipt-print-area,
          #thermal-receipt-print-area * {
            visibility: visible !important;
          }
          /* Absolute position the print area at top-left to avoid spacing blank spaces */
          #thermal-receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-sizing: border-box !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
          }
          .print-exclude {
            display: none !important;
          }
        }
      `}} />

      {/* LEFT COLUMN: Ready Orders (55% width) */}
      <div className="flex w-full lg:w-[55%] flex-col border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden shrink-0">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 p-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-coral-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Ready for Checkout ({readyOrders.length})
            </h2>
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto p-3 space-y-2.5 bg-zinc-50/50 dark:bg-zinc-950/20">
          {loadingActive && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xs">
              <Loader size="md" text="Syncing checkout queue..." />
            </div>
          )}
          {readyOrders.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-zinc-400 p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
              <CheckCircle className="h-10 w-10 stroke-[1.2] text-zinc-300 mb-2" />
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">No pending payments</p>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px]">
                Complete orders in KDS first, then process payments here.
              </p>
            </div>
          ) : (
            readyOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 rounded-lg shadow-sm"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-zinc-950 dark:text-zinc-100">
                      Order {order.orderNumber} {order.table ? `(${order.table.name})` : '(Takeaway)'}
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {order.status === 'PARTIALLY_PAID' && (
                      <span className="rounded bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 text-[8px] font-black text-amber-700 dark:text-amber-450 border border-amber-200 dark:border-amber-900 uppercase">
                        Partially Paid
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-black text-coral-500">
                    ${order.totals.total}
                  </span>
                </div>

                {/* Items Summary */}
                <div className="space-y-1 text-[11px] font-bold text-zinc-650 dark:text-zinc-400 mb-3">
                  {order.items.map((item) => (
                    <div key={item.menuItem.id} className="flex justify-between">
                      <span>
                        {item.menuItem.name} <span className="text-[10px] text-zinc-400 dark:text-zinc-500">x{item.quantity}</span>
                      </span>
                      <span>${(item.menuItem.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <button
                  onClick={() => setSelectedOrderForBill(order)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-coral-500 hover:bg-coral-600 py-2.5 text-xs font-black text-white transition-all shadow-sm cursor-pointer"
                >
                  <Receipt className="h-4 w-4" />
                  CHECKOUT & PRINT
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Completed Orders (45% width) */}
      <div className="flex w-full lg:w-[45%] flex-col border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden shrink-0">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Completed Orders ({completedOrders.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={completedFilter}
              onChange={(e) => setCompletedFilter(e.target.value as any)}
              className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[9px] font-black uppercase py-1 px-1.5 outline-none focus:border-coral-500 cursor-pointer text-zinc-700 dark:text-zinc-350"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto p-3 space-y-2 bg-zinc-50/30">
          {loadingCompleted && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xs">
              <Loader size="md" text="Syncing history..." />
            </div>
          )}
          {completedOrders.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-zinc-400 text-center">
              <Receipt className="h-10 w-10 stroke-[1.2] text-zinc-300 mb-2" />
              <p className="text-xs font-bold text-zinc-500">No completed orders yet</p>
            </div>
          ) : (
            completedOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 rounded-lg shadow-sm"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-zinc-950 dark:text-zinc-100">
                      {order.orderNumber} {order.table ? `(${order.table.name})` : '(Takeaway)'}
                    </span>
                    <span className="rounded bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 text-[8px] font-black text-emerald-700 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900 uppercase">
                      PAID
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold mt-0.5">
                    Total: <span className="font-extrabold text-zinc-800 dark:text-zinc-200">${order.totals.total}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedOrderForBill(order)}
                  className="flex items-center gap-1 rounded bg-zinc-100 dark:bg-zinc-955 border border-zinc-350 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 px-2.5 py-1.5 text-[10px] font-black text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  VIEW RECEIPT
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SHADCN-STYLE THERMAL PRINTER INVOICE DIALOG */}
      {selectedOrderForBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in print-modal-container animate-fade-in">
          <div className={`relative flex flex-col bg-white dark:bg-zinc-905 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full ${selectedOrderForBill.status === 'PAID' ? 'max-w-sm' : 'max-w-4xl'} max-h-[90vh] overflow-hidden print-modal-dialog`}>
            {/* Modal Header */}
            <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-955 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 print-exclude">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-650 dark:text-zinc-400">
                {selectedOrderForBill.status === 'PAID' ? 'Invoice Print Preview' : 'Checkout Order details'}
              </span>
              <button
                onClick={() => setSelectedOrderForBill(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-655 dark:hover:text-zinc-100 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Receipt Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-100 dark:bg-zinc-950/40 print-modal-content">
              <div className="flex flex-col md:flex-row gap-6 justify-center items-start">
                
                {/* Left Column: Editor (Only show if not paid) */}
                {selectedOrderForBill.status !== 'PAID' && (
                  <div className="w-full md:w-1/2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-4 print-exclude shrink-0 shadow-sm">
                    
                    {/* Discounts & Coupons Section */}
                    <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 border border-zinc-200 dark:border-zinc-850 rounded-lg space-y-3">
                      <h5 className="text-[10px] font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 pb-1 flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-coral-500" />
                        <span>Discounts & Coupons</span>
                      </h5>
                      
                      <div>
                        <label className="block text-[8px] font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1">
                          Manual Discount ($)
                        </label>
                        <div className="relative flex items-center">
                          <Percent className="absolute left-2.5 h-3.5 w-3.5 text-zinc-400" />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Enter discount amount"
                            value={manualDiscountInput}
                            onChange={(e) => setManualDiscountInput(e.target.value)}
                            className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-coral-500 dark:text-zinc-100 font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[8px] font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1">
                          Coupon Code
                        </label>
                        <div className="relative flex items-center">
                          <Tag className="absolute left-2.5 h-3.5 w-3.5 text-zinc-400" />
                          <input
                            type="text"
                            placeholder="e.g. WELCOME10"
                            value={couponCodeInput}
                            onChange={(e) => setCouponCodeInput(e.target.value)}
                            className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-coral-500 uppercase dark:text-zinc-100 font-bold"
                          />
                        </div>
                      </div>
                      
                      <button
                        onClick={handleApplyDiscountAndCoupon}
                        disabled={loadingDiscounts || payingOrderId !== null}
                        className="w-full py-2 bg-zinc-900 dark:bg-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-900 text-[10px] font-black text-white rounded-lg transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {loadingDiscounts ? (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            <span>APPLYING...</span>
                          </>
                        ) : (
                          <span>APPLY DISCOUNTS / COUPONS</span>
                        )}
                      </button>

                      {couponError && <p className="text-[10px] font-bold text-red-500">{couponError}</p>}
                      {couponSuccess && <p className="text-[10px] font-bold text-emerald-500">{couponSuccess}</p>}
                    </div>

                    {/* Split Payments Builder */}
                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 space-y-3">
                      <h5 className="text-[10px] font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 pb-1 flex items-center gap-1.5">
                        <Banknote className="h-3.5 w-3.5 text-coral-500" />
                        <span>Record Payments</span>
                      </h5>
                      
                      {/* Existing payments already stored in db */}
                      {selectedOrderForBill.payments && selectedOrderForBill.payments.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-zinc-400 uppercase">Received Transactions:</p>
                          {selectedOrderForBill.payments.map((p, idx) => (
                            <div key={p.id || idx} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded px-2 py-1 text-[10px] font-bold text-zinc-650 dark:text-zinc-400">
                              <span className="uppercase text-[9px]">{p.paymentMethod} {p.transactionReference ? `(${p.transactionReference})` : ''}</span>
                              <span className="font-extrabold text-zinc-900 dark:text-zinc-100">${p.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Local pending payments to be added */}
                      {localPayments.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-coral-500 uppercase">Pending Finalization:</p>
                          {localPayments.map((p, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-coral-50/50 dark:bg-coral-955/10 border border-coral-200 dark:border-coral-900 rounded px-2 py-1 text-[10px] font-bold text-coral-650 dark:text-coral-450">
                              <span className="uppercase text-[9px]">{p.paymentMethod} {p.transactionReference ? `(${p.transactionReference})` : ''}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold">${p.amount.toFixed(2)}</span>
                                <button
                                  onClick={() => handleRemovePayment(idx)}
                                  className="text-zinc-450 hover:text-red-500 rounded p-0.5"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add payment inputs */}
                      <div className="grid grid-cols-12 gap-2 bg-zinc-50 dark:bg-zinc-950/40 p-2 border border-zinc-200 dark:border-zinc-850 rounded-lg">
                        <div className="col-span-5">
                          <label className="block text-[8px] font-black uppercase text-zinc-400 dark:text-zinc-500 mb-0.5">Amount ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Amount"
                            value={paymentAmountInput}
                            onChange={(e) => setPaymentAmountInput(e.target.value)}
                            className="w-full rounded border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 py-1 text-xs font-bold outline-none focus:border-coral-500 dark:text-zinc-100"
                          />
                        </div>
                        <div className="col-span-4">
                          <label className="block text-[8px] font-black uppercase text-zinc-400 dark:text-zinc-500 mb-0.5">Method</label>
                          <select
                            value={paymentMethodInput}
                            onChange={(e) => setPaymentMethodInput(e.target.value as any)}
                            className="w-full rounded border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 py-1 text-xs font-bold outline-none focus:border-coral-500 dark:text-zinc-100"
                          >
                            <option value="CASH">CASH</option>
                            <option value="CARD">CARD</option>
                            <option value="UPI">UPI</option>
                          </select>
                        </div>
                        <div className="col-span-3 flex items-end">
                          <button
                            onClick={handleAddPayment}
                            className="w-full h-[26px] flex items-center justify-center gap-1 rounded bg-coral-500 hover:bg-coral-600 text-white font-black text-xs transition-colors cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            ADD
                          </button>
                        </div>
                        <div className="col-span-12">
                          <input
                            type="text"
                            placeholder="Transaction reference (Optional)"
                            value={paymentRefInput}
                            onChange={(e) => setPaymentRefInput(e.target.value)}
                            className="w-full rounded border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-955 px-2 py-1 text-[10px] font-bold outline-none focus:border-coral-500 dark:text-zinc-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pay Status Summary */}
                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 text-xs font-bold text-zinc-650 dark:text-zinc-400 space-y-1.5">
                      <div className="flex justify-between text-zinc-900 dark:text-zinc-100">
                        <span>Grand Total:</span>
                        <span className="font-extrabold">${selectedOrderForBill.totals.total}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>Total Paid:</span>
                        <span className="font-extrabold">${totalPaid.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2 text-sm font-black text-zinc-900 dark:text-zinc-100">
                        <span>Remaining Balance:</span>
                        <span className="text-coral-500 text-base">${remainingBalance.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={handleFinalizeCheckout}
                        disabled={payingOrderId !== null}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-black text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {payingOrderId ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        {checkoutButtonText}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Right column: Monospace Thermal Invoice Preview */}
                <div className="w-full md:w-auto flex justify-center">
                  <div
                    id="thermal-receipt-print-area"
                    className="w-full max-w-[80mm] sm:w-[80mm] bg-white border border-zinc-300 shadow-sm p-4 text-zinc-950 font-mono text-[11px] leading-relaxed"
                    style={{ fontFamily: 'Courier New, Courier, monospace' }}
                  >
                    {/* Header Info */}
                    <div className="text-center space-y-1">
                      {restaurantSettings?.logo && (
                        <div className="text-sm font-bold mb-1">
                          {restaurantSettings.logo.startsWith('http') ? (
                            <img src={restaurantSettings.logo} alt="logo" className="mx-auto h-8 object-contain" />
                          ) : (
                            <span className="text-base">{restaurantSettings.logo}</span>
                          )}
                        </div>
                      )}
                      <h3 className="text-sm font-extrabold tracking-wide uppercase">
                        {restaurantSettings?.name || user?.restaurantName || 'KHAOPIO RESTAURANT'}
                      </h3>
                      <p className="text-[10px] text-zinc-650">
                        {restaurantSettings?.address || '123 Agentic Way, Silicon Valley'}
                      </p>
                      <p className="text-[10px] text-zinc-650">
                        PH: {restaurantSettings?.phone || '+1 (555) 019-9000'}
                      </p>
                      {restaurantSettings?.gstin && (
                        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
                          GSTIN: {restaurantSettings.gstin}
                        </p>
                      )}
                      
                      {selectedOrderForBill.status === 'PAID' ? (
                        <div className="inline-block font-extrabold text-[9px] bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded border border-zinc-300 uppercase tracking-widest mt-1">
                          TAX INVOICE
                        </div>
                      ) : (
                        <div className="inline-block font-extrabold text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300 uppercase tracking-widest mt-1">
                          ESTIMATE / PRE-BILL
                        </div>
                      )}
                    </div>

                    {/* Dashed line separator */}
                    <div className="my-2 border-t border-dashed border-zinc-900"></div>

                    {/* Transaction Metadata */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span>DATE: {new Date(selectedOrderForBill.createdAt).toLocaleDateString()}</span>
                        <span>TIME: {new Date(selectedOrderForBill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div>ORDER NO: {selectedOrderForBill.orderNumber}</div>
                      <div>TABLE: {selectedOrderForBill.table ? selectedOrderForBill.table.name.toUpperCase() : 'TAKEAWAY'}</div>
                      <div>INVOICE ID: INV-{selectedOrderForBill.id.split('-')[0]?.toUpperCase()}</div>
                      <div className="capitalize">
                        PAY STATUS: <span className="font-extrabold">{selectedOrderForBill.status.replace('_', ' ')}</span>
                      </div>
                    </div>

                    {/* Dashed line separator */}
                    <div className="my-2 border-t border-dashed border-zinc-900"></div>

                    {/* Itemized Table Headers */}
                    <div className="grid grid-cols-12 font-extrabold mb-1">
                      <span className="col-span-6">ITEM DESCRIPTION</span>
                      <span className="col-span-2 text-center">QTY</span>
                      <span className="col-span-4 text-right">AMOUNT</span>
                    </div>

                    {/* Dashed line separator */}
                    <div className="my-1 border-t border-dashed border-zinc-400"></div>

                    {/* Itemized Rows */}
                    <div className="space-y-1">
                      {selectedOrderForBill.items.map((item) => (
                        <div key={item.menuItem.id} className="grid grid-cols-12 text-[10px]">
                          <span className="col-span-6 truncate uppercase">{item.menuItem.name}</span>
                          <span className="col-span-2 text-center">{item.quantity}</span>
                          <span className="col-span-4 text-right">
                            ${(item.menuItem.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Dashed line separator */}
                    <div className="my-2 border-t border-dashed border-zinc-900"></div>

                    {/* Financial Summary */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between font-medium">
                        <span>SUBTOTAL:</span>
                        <span>${selectedOrderForBill.totals.subtotal}</span>
                      </div>
                      {parseFloat(selectedOrderForBill.totals.discount) > 0 && (
                        <div className="flex justify-between font-medium text-[10px] text-red-650">
                          <span>DISCOUNT {selectedOrderForBill.couponCode ? `(${selectedOrderForBill.couponCode})` : ''}:</span>
                          <span>-${parseFloat(selectedOrderForBill.totals.discount).toFixed(2)}</span>
                        </div>
                      )}
                      {parseFloat(selectedOrderForBill.totals.serviceCharge) > 0 && (
                        <div className="flex justify-between font-medium text-[10px]">
                          <span>SERVICE CHARGE @ {parseFloat(selectedOrderForBill.totals.serviceChargeRate)}%:</span>
                          <span>${parseFloat(selectedOrderForBill.totals.serviceCharge).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium text-[10px]">
                        <span>CGST @ {(parseFloat(selectedOrderForBill.totals.taxRate) / 2).toFixed(1)}%:</span>
                        <span>${(parseFloat(selectedOrderForBill.totals.tax) / 2).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-[10px]">
                        <span>SGST @ {(parseFloat(selectedOrderForBill.totals.taxRate) / 2).toFixed(1)}%:</span>
                        <span>${(parseFloat(selectedOrderForBill.totals.tax) / 2).toFixed(2)}</span>
                      </div>
                      
                      {/* Dashed line separator */}
                      <div className="my-1 border-t border-dashed border-zinc-400"></div>

                      <div className="flex justify-between font-black text-xs pt-0.5">
                        <span>TOTAL AMOUNT:</span>
                        <span>${selectedOrderForBill.totals.total}</span>
                      </div>

                      {/* Display transactions list if available */}
                      {selectedOrderForBill.payments && selectedOrderForBill.payments.length > 0 && (
                        <>
                          <div className="my-1.5 border-t border-dashed border-zinc-400"></div>
                          <div className="text-[9px] font-extrabold uppercase mb-0.5">TRANSACTIONS MADE:</div>
                          {selectedOrderForBill.payments.map((p, idx) => (
                            <div key={p.id || idx} className="flex justify-between text-[10px]">
                              <span className="uppercase text-[9px]">- {p.paymentMethod} {p.transactionReference ? `(${p.transactionReference})` : ''}:</span>
                              <span>${p.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    {/* Dashed line separator */}
                    <div className="my-2 border-t border-dashed border-zinc-900"></div>

                    {/* Footer Message */}
                    <div className="text-center space-y-1 mt-3">
                      <p className="text-[10px] font-bold uppercase">
                        {restaurantSettings?.thankYouMessage || 'THANK YOU FOR DINE IN!'}
                      </p>
                      <p className="text-[9px] text-zinc-500 italic">
                        Powered by KhaoPio POS
                      </p>
                      {/* Barcode representation */}
                      <div className="flex flex-col items-center pt-2">
                        <div className="flex h-7 bg-zinc-950 w-32 items-stretch justify-around px-2.5">
                          <span className="w-[1px] bg-white"></span>
                          <span className="w-[2px] bg-white"></span>
                          <span className="w-[1px] bg-white"></span>
                          <span className="w-[3px] bg-white"></span>
                          <span className="w-[1px] bg-white"></span>
                          <span className="w-[2px] bg-white"></span>
                          <span className="w-[1px] bg-white"></span>
                          <span className="w-[4px] bg-white"></span>
                          <span className="w-[2px] bg-white"></span>
                          <span className="w-[1px] bg-white"></span>
                          <span className="w-[3px] bg-white"></span>
                        </div>
                        <span className="text-[7px] text-zinc-500 tracking-[0.2em] mt-0.5">
                          *{selectedOrderForBill.id.substring(0, 8).toUpperCase()}*
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 bg-zinc-50 dark:bg-zinc-955 border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 print-exclude">
              <button
                onClick={() => setSelectedOrderForBill(null)}
                className="flex-1 py-2 text-xs font-black text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                CLOSE
              </button>
              <button
                onClick={handlePrintAction}
                className="flex-1 py-2 text-xs font-black text-white bg-zinc-900 dark:bg-zinc-950 hover:bg-zinc-850 dark:hover:bg-zinc-900 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                PRINT INVOICE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
