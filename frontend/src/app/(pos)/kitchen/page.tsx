'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { usePOSStore } from '@/store/usePOSStore';
import { Order } from '@/types/pos';
import { Play, Check, Flame, AlertCircle, Clock, ChefHat } from 'lucide-react';

// Live timer component for each ticket to show elapsed time since order creation
function ElapsedTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState('');
  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    const calculateElapsed = () => {
      const created = new Date(createdAt).getTime();
      const now = new Date().getTime();
      const diffMs = now - created;
      
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      
      // Mark as delayed if order is older than 5 minutes (300 seconds)
      setIsDelayed(diffMs > 5 * 60 * 1000);

      const minsStr = diffMins.toString().padStart(2, '0');
      const secsStr = diffSecs.toString().padStart(2, '0');
      setElapsed(`${minsStr}:${secsStr}`);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <div
      className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-black border transition-all duration-150 ${
        isDelayed
          ? 'bg-red-100 text-red-700 border-red-300 animate-pulse'
          : 'bg-zinc-100 text-zinc-700 border-zinc-200'
      }`}
    >
      <Clock className="h-3 w-3" />
      <span>{elapsed}</span>
      {isDelayed && <AlertCircle className="ml-0.5 h-3.5 w-3.5 text-red-600" />}
    </div>
  );
}

export default function KitchenPage() {
  const { activeOrders, updateOrderStatus, fetchActiveOrders, fetchMenuItems } = usePOSStore();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PREPARING'>('ALL');

  useEffect(() => {
    fetchMenuItems().then(() => {
      fetchActiveOrders();
    });
    const interval = setInterval(fetchActiveOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchActiveOrders, fetchMenuItems]);

  // Filter kitchen orders ('KITCHEN_PENDING' or 'PREPARING')
  const kitchenOrders = useMemo(() => {
    return activeOrders.filter((order) => {
      const isKitchenStatus =
        order.status === 'KITCHEN_PENDING' || order.status === 'PREPARING';
      
      if (!isKitchenStatus) return false;

      if (filter === 'PENDING') return order.status === 'KITCHEN_PENDING';
      if (filter === 'PREPARING') return order.status === 'PREPARING';
      return true;
    });
  }, [activeOrders, filter]);

  // Audio alerts for KDS (optional, runs on client if activeOrders length changes)
  const pendingCount = useMemo(() => {
    return activeOrders.filter((o) => o.status === 'KITCHEN_PENDING').length;
  }, [activeOrders]);

  useEffect(() => {
    // Custom ding sound can be added here, or a visual notification flash.
    if (pendingCount > 0) {
      console.log('KDS Alert: New pending order in kitchen!');
    }
  }, [pendingCount]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
      {/* KDS Header & Filter bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-coral-500" />
          <h1 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-100">
            Kitchen Display System (KDS)
          </h1>
          <span className="ml-2 rounded-full bg-zinc-900 dark:bg-zinc-100 px-2.5 py-0.5 text-xs font-extrabold text-white dark:text-zinc-950">
            {kitchenOrders.length} Active Tickets
          </span>
        </div>

        {/* Filter Tab Controllers */}
        <div className="flex bg-zinc-100 dark:bg-zinc-950 p-0.5 rounded-lg border border-zinc-300 dark:border-zinc-850">
          {(['ALL', 'PENDING', 'PREPARING'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-md px-3 py-1 text-[10px] font-black tracking-wide transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-white dark:bg-zinc-900 text-zinc-955 dark:text-zinc-50 shadow-sm'
                  : 'text-zinc-650 dark:text-zinc-450 hover:text-zinc-955 dark:hover:text-zinc-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Active Kitchen Orders */}
      <div className="flex-1 overflow-x-auto p-4">
        {kitchenOrders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-zinc-400 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800">
            <Flame className="h-12 w-12 stroke-[1.2] text-zinc-300 mb-2 animate-pulse" />
            <p className="text-xs font-black text-zinc-500 dark:text-zinc-450">No active kitchen orders</p>
            <p className="text-[10px] text-zinc-400 mt-1">
              New orders sent from the Billing counter will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="flex gap-4 items-start h-full">
            {kitchenOrders.map((order) => {
              const isPending = order.status === 'KITCHEN_PENDING';
              return (
                <div
                  key={order.id}
                  className={`flex w-72 flex-col rounded-xl border-2 bg-white dark:bg-zinc-900 shadow-md transition-all duration-200 shrink-0 ${
                    isPending
                      ? 'border-coral-500 ring-2 ring-coral-500/20'
                      : 'border-blue-500 ring-2 ring-blue-500/20'
                  }`}
                >
                  {/* Order Ticket Header */}
                  <div
                    className={`flex items-center justify-between border-b dark:border-zinc-805 px-3 py-2 rounded-t-lg ${
                      isPending ? 'bg-coral-50/80 dark:bg-coral-950/20 border-coral-200 dark:border-coral-800' : 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-black text-zinc-905 dark:text-zinc-50 leading-none">
                        {order.orderNumber}
                      </span>
                      <div className="text-[9px] font-extrabold text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Items: {order.items.reduce((acc, ci) => acc + ci.quantity, 0)}
                      </div>
                    </div>
                    {/* Live Timer */}
                    <ElapsedTimer createdAt={order.createdAt} />
                  </div>

                  {/* Order Items (Readable, large-text list for screen mounting) */}
                  <div className="flex-1 overflow-y-auto px-3 py-2.5 max-h-[300px] min-h-[160px] divide-y divide-zinc-105 dark:divide-zinc-800">
                    {order.items.map((item) => (
                      <div key={item.menuItem.id} className="flex items-start justify-between py-2">
                        <div className="flex items-start gap-2">
                          <span className="text-lg mt-0.5">{item.menuItem.image}</span>
                          <div>
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                              {item.menuItem.name}
                            </span>
                            <span className="ml-1 text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase">
                              [{item.menuItem.code}]
                            </span>
                          </div>
                        </div>
                        {/* Large Font Size for Quantity */}
                        <span className="rounded bg-zinc-900 px-2 py-0.5 text-sm font-black text-white leading-none">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action button at bottom */}
                  <div className="border-t border-zinc-200 dark:border-zinc-800 p-2 bg-zinc-50 dark:bg-zinc-950 rounded-b-xl">
                    {isPending ? (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-coral-500 hover:bg-coral-600 py-2.5 text-xs font-black text-white transition-all shadow-sm cursor-pointer"
                      >
                        <Play className="h-4 w-4 fill-white" />
                        ACCEPT / PREPARE
                      </button>
                    ) : (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'READY')}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-xs font-black text-white hover:bg-blue-700 transition-colors shadow-sm animate-pulse"
                      >
                        <Check className="h-4 w-4 stroke-[3]" />
                        MARK AS READY
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
