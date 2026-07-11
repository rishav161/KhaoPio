'use client';

import React, { useState, useMemo } from 'react';
import { usePOSStore } from '@/store/usePOSStore';
import { Order } from '@/types/pos';
import { Banknote, CreditCard, Receipt, CheckCircle, Printer, X, ShoppingBag } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CheckoutPage() {
  const { activeOrders, completePayment, fetchActiveOrders, fetchMenuItems } = usePOSStore();
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<Order | null>(null);

  React.useEffect(() => {
    fetchMenuItems().then(() => {
      fetchActiveOrders();
    });
    const interval = setInterval(fetchActiveOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchActiveOrders, fetchMenuItems]);

  // Filter orders with READY status
  const readyOrders = useMemo(() => {
    return activeOrders.filter((order) => order.status === 'READY');
  }, [activeOrders]);

  // Filter completed/PAID orders
  const completedOrders = useMemo(() => {
    return activeOrders.filter((order) => order.status === 'PAID');
  }, [activeOrders]);

  const handlePayment = (orderId: string, method: 'CASH' | 'CARD_UPI') => {
    completePayment(orderId, method);
    
    // Play confetti explosion!
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#f97316', '#10b981', '#3b82f6', '#f59e0b'],
    });
  };

  const handlePrintAction = () => {
    // Trigger standard browser print or simulate
    window.print();
  };

  return (
    <div className="flex h-full w-full gap-3 overflow-hidden">
      {/* Print-only CSS style injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt-print-area, #thermal-receipt-print-area * {
            visibility: visible;
          }
          #thermal-receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 0;
            margin: 0;
          }
        }
      `}} />

      {/* LEFT COLUMN: Ready Orders (55% width) */}
      <div className="flex w-[55%] flex-col border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden">
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

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-zinc-50/50 dark:bg-zinc-950/20">
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
                  <div>
                    <span className="text-xs font-black text-zinc-950 dark:text-zinc-100">
                      Order {order.orderNumber}
                    </span>
                    <span className="ml-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-bold">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
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
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-black text-white transition-colors shadow-sm"
                  >
                    <Banknote className="h-4 w-4" />
                    COLLECT CASH
                  </button>
                  <button
                    onClick={() => handlePayment(order.id, 'CARD_UPI')}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-850 py-2 text-xs font-black text-white transition-colors shadow-sm"
                  >
                    <CreditCard className="h-4 w-4" />
                    CARD / UPI
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Completed Orders (45% width) */}
      <div className="flex w-[45%] flex-col border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Completed Orders (Paid)
            </h2>
          </div>
          <span className="rounded bg-emerald-100 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-450">
            {completedOrders.length} Paid
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-zinc-50/30">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative flex flex-col bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-sm max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
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
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-100 flex justify-center">
              {/* Thermal Printer Layout (80mm width simulation, monospace, center-aligned top) */}
              <div
                id="thermal-receipt-print-area"
                className="w-[80mm] bg-white border border-zinc-300 shadow-sm p-4 text-zinc-950 font-mono text-[11px] leading-relaxed"
                style={{ fontFamily: 'Courier New, Courier, monospace' }}
              >
                {/* Header Info */}
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-extrabold tracking-wide uppercase">
                    KHAOPIO RESTAURANT
                  </h3>
                  <p className="text-[10px] text-zinc-600">
                    123 Agentic Way, Silicon Valley
                  </p>
                  <p className="text-[10px] text-zinc-600">
                    GSTIN: 27AAAAA1111A1Z1
                  </p>
                  <p className="text-[10px] text-zinc-600">
                    PH: +1 (555) 019-9000
                  </p>
                </div>

                {/* Dashed line separator */}
                <div className="my-2 border-t border-dashed border-zinc-900"></div>

                {/* Transaction Metadata */}
                <div className="space-y-0.5">
                  <div className="flex justify-between">
                    <span>DATE: {new Date(selectedOrderForBill.createdAt).toLocaleDateString()}</span>
                    <span>TIME: {new Date(selectedOrderForBill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div>ORDER NO: {selectedOrderForBill.orderNumber}</div>
                  <div>INVOICE ID: INV-{selectedOrderForBill.id.split('_')[1]?.toUpperCase()}</div>
                  <div className="capitalize">METHOD: {selectedOrderForBill.paymentMethod?.replace('_', ' ')}</div>
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
                    <div className="flex gap-[1px] h-6 bg-zinc-950 w-24">
                      {/* Barcode styling helper lines */}
                      <span className="w-[1px] bg-white"></span>
                      <span className="w-[2px] bg-white"></span>
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
            <div className="flex gap-2 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 px-4 py-3">
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
