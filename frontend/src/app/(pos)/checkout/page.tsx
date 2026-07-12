'use client';

import React, { useState, useMemo } from 'react';
import { usePOSStore } from '@/store/usePOSStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Order } from '@/types/pos';
import { Banknote, CreditCard, Receipt, CheckCircle, Printer, X, ShoppingBag } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Loader } from '@/components/Loader';

export default function CheckoutPage() {
  const { activeOrders, completePayment, fetchActiveOrders, fetchMenuItems } = usePOSStore();
  const { user } = useAuthStore();
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<Order | null>(null);
  const [completedFilter, setCompletedFilter] = useState<'today' | 'yesterday' | '7days' | 'all'>('today');
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [loadingActive, setLoadingActive] = useState(false);

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

  // Filter orders with READY status
  const readyOrders = useMemo(() => {
    return activeOrders.filter((order) => order.status === 'READY');
  }, [activeOrders]);

  // Filter completed/PAID orders
  const completedOrders = useMemo(() => {
    return activeOrders.filter((order) => order.status === 'PAID');
  }, [activeOrders]);

  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const handlePayment = async (orderId: string, method: 'CASH' | 'CARD_UPI') => {
    setPayingOrderId(orderId);
    try {
      await completePayment(orderId, method);
      
      // Play confetti explosion!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f97316', '#10b981', '#3b82f6', '#f59e0b'],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setPayingOrderId(null);
    }
  };

  const handlePrintAction = () => {
    // Trigger standard browser print or simulate
    window.print();
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-3 overflow-y-auto lg:overflow-hidden">
      {/* Print-only CSS style injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide all other elements in the body */
          body > :not(.print-modal-container) {
            display: none !important;
          }
          /* Reset parent modal structures so they don't constrain the receipt */
          .print-modal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            height: auto !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
          }
          .print-modal-dialog {
            width: 80mm !important;
            max-width: none !important;
            max-height: none !important;
            height: auto !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
            overflow: visible !important;
            background: white !important;
          }
          .print-modal-content {
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
            background: white !important;
          }
          .print-exclude {
            display: none !important;
          }
          /* Thermal print content formatting */
          #thermal-receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            border: none !important;
            box-shadow: none !important;
            padding: 10px !important;
            margin: 0 !important;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
        }
      `}} />

      {/* LEFT COLUMN: Ready Orders (55% width) */}
      <div className="flex w-full lg:w-[55%] flex-col border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden shrink-0">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-coral-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Ready for Checkout (Ready)
            </h2>
          </div>
          <span className="rounded bg-coral-100 dark:bg-coral-950/20 border border-coral-200 dark:border-coral-900 px-2 py-0.5 text-[10px] font-black text-coral-600 dark:text-coral-450">
            {readyOrders.length} Pending Payment
          </span>
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
                      Order {order.orderNumber}
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => setSelectedOrderForBill(order)}
                      className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-coral-500 transition-colors cursor-pointer"
                      title="Print Pre-Bill"
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-black text-coral-500">
                    ${order.totals.total}
                  </span>
                </div>

                {/* Items Summary */}
                <div className="space-y-1 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-3">
                  {order.items.map((item) => (
                    <div key={item.menuItem.id} className="flex justify-between">
                      <span>
                        {item.menuItem.name} <span className="text-[10px] text-zinc-400 dark:text-zinc-500">x{item.quantity}</span>
                      </span>
                      <span>${(item.menuItem.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Action payment buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePayment(order.id, 'CASH')}
                    disabled={payingOrderId !== null}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-black text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {payingOrderId === order.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      <Banknote className="h-4 w-4" />
                    )}
                    {payingOrderId === order.id ? 'PROCESSING...' : 'COLLECT CASH'}
                  </button>
                  <button
                    onClick={() => handlePayment(order.id, 'CARD_UPI')}
                    disabled={payingOrderId !== null}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-850 py-2 text-xs font-black text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {payingOrderId === order.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    {payingOrderId === order.id ? 'PROCESSING...' : 'CARD / UPI'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Completed Orders (45% width) */}
      <div className="flex w-full lg:w-[45%] flex-col border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden shrink-0">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Completed Orders (Paid)
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
            <span className="rounded bg-emerald-100 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-450">
              {completedOrders.length} Paid
            </span>
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
                      {order.orderNumber}
                    </span>
                    <span className="rounded bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 text-[9px] font-black text-emerald-700 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900">
                      {order.paymentMethod === 'CASH' ? 'CASH' : 'CARD/UPI'}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold mt-0.5">
                    Total: <span className="font-extrabold text-zinc-800 dark:text-zinc-200">${order.totals.total}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedOrderForBill(order)}
                  className="flex items-center gap-1 rounded bg-zinc-100 dark:bg-zinc-950 border border-zinc-350 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 px-2.5 py-1.5 text-[10px] font-black text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  PRINT BILL
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SHADCN-STYLE THERMAL PRINTER INVOICE DIALOG */}
      {selectedOrderForBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in print-modal-container">
          <div className="relative flex flex-col bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-sm max-h-[90vh] overflow-hidden print-modal-dialog">
            {/* Modal Header */}
            <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 print-exclude">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Invoice Print Preview
              </span>
              <button
                onClick={() => setSelectedOrderForBill(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-100 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Receipt Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-zinc-100 flex justify-center print-modal-content">
              {/* Thermal Printer Layout (80mm width simulation, monospace, center-aligned top) */}
              <div
                id="thermal-receipt-print-area"
                className="w-full max-w-[80mm] sm:w-[80mm] bg-white border border-zinc-300 shadow-sm p-4 text-zinc-950 font-mono text-[11px] leading-relaxed"
                style={{ fontFamily: 'Courier New, Courier, monospace' }}
              >
                {/* Header Info */}
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-extrabold tracking-wide uppercase">
                    {user?.restaurantName || 'KHAOPIO RESTAURANT'}
                  </h3>
                  <p className="text-[10px] text-zinc-600">
                    123 Agentic Way, Silicon Valley
                  </p>
                  <p className="text-[10px] text-zinc-600">
                    PH: +1 (555) 019-9000
                  </p>
                  
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
                  <div>INVOICE ID: INV-{selectedOrderForBill.id.split('-')[0]?.toUpperCase()}</div>
                  <div className="capitalize">
                    METHOD: {selectedOrderForBill.paymentMethod ? selectedOrderForBill.paymentMethod.replace('_', ' ') : 'UNPAID'}
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
                  <div className="flex justify-between font-medium text-[10px]">
                    <span>CGST @ 2.5%:</span>
                    <span>${(parseFloat(selectedOrderForBill.totals.tax) / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-[10px]">
                    <span>SGST @ 2.5%:</span>
                    <span>${(parseFloat(selectedOrderForBill.totals.tax) / 2).toFixed(2)}</span>
                  </div>
                  
                  {/* Dashed line separator */}
                  <div className="my-1 border-t border-dashed border-zinc-400"></div>

                  <div className="flex justify-between font-black text-xs pt-0.5">
                    <span>TOTAL AMOUNT:</span>
                    <span>${selectedOrderForBill.totals.total}</span>
                  </div>
                </div>

                {/* Dashed line separator */}
                <div className="my-2 border-t border-dashed border-zinc-900"></div>

                {/* Footer Message */}
                <div className="text-center space-y-1 mt-3">
                  <p className="text-[10px] font-bold">
                    THANK YOU FOR DINE IN!
                  </p>
                  <p className="text-[9px] text-zinc-500 italic">
                    Powered by Antigravity POS
                  </p>
                  {/* Mock Barcode / QR Code */}
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

            {/* Modal Actions */}
            <div className="flex gap-2 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 print-exclude">
              <button
                onClick={() => setSelectedOrderForBill(null)}
                className="flex-1 py-2 text-xs font-black text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                CLOSE
              </button>
              <button
                onClick={handlePrintAction}
                className="flex-1 py-2 text-xs font-black text-white bg-zinc-900 dark:bg-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-850 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
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
