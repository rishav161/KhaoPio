'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePOSStore } from '@/store/usePOSStore';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CartItem, Order } from '@/types/pos';
import {
  Search, Plus, Minus, Trash2, Soup, ShoppingCart, Send, X, ChevronRight,
  ArrowLeft, Clock, UtensilsCrossed, Receipt, CheckCircle2, Ban,
  RefreshCw, Table2, LayoutList, Columns3, ClipboardList, FlameKindling, CreditCard,
} from 'lucide-react';
import { Loader } from '@/components/Loader';
import { apiFetch } from '@/utils/api';
import { useCurrencySymbol } from '@/utils/currency';
import Big from 'big.js';

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT:           { label: 'Draft',          color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',           dot: 'bg-zinc-400' },
  KITCHEN_PENDING: { label: 'Pending',         color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',    dot: 'bg-amber-500' },
  PREPARING:       { label: 'Preparing',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',        dot: 'bg-blue-500' },
  READY:           { label: 'Ready',           color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',    dot: 'bg-green-500' },
  BILL_REQUESTED:  { label: 'Bill Requested',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',dot: 'bg-purple-500' },
  PARTIALLY_PAID:  { label: 'Partially Paid',  color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',dot: 'bg-indigo-500' },
  PAID:            { label: 'Paid',            color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', dot: 'bg-emerald-500' },
  CANCELLED:       { label: 'Cancelled',       color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',            dot: 'bg-red-500' },
};

const ONGOING_STATUSES = new Set(['DRAFT', 'KITCHEN_PENDING', 'PREPARING', 'READY', 'BILL_REQUESTED', 'PARTIALLY_PAID']);
const COMPLETED_STATUSES = new Set(['PAID', 'CANCELLED']);

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Order card ────────────────────────────────────────────────────────────────

function OrderCard({ order, currencySymbol, onCheckout }: {
  order: Order;
  currencySymbol: string;
  onCheckout: (id: string) => void;
}) {
  const meta = STATUS_META[order.status] ?? STATUS_META.DRAFT;
  const activeItems = order.items.filter(i => i.status !== 'CANCELLED');
  const itemSummary = activeItems.slice(0, 3).map(i => `${i.menuItem.name} ×${i.quantity}`).join(', ');
  const extraCount = activeItems.length - 3;

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700 transition-all duration-150">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-black text-zinc-900 dark:text-zinc-100">{order.orderNumber}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${meta.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
          <Clock className="h-3 w-3" />
          {relativeTime(order.createdAt)}
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 py-3 flex-1 space-y-2">
        {/* Table */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400">
          <Table2 className="h-3.5 w-3.5 shrink-0" />
          <span>{order.table?.name ?? 'Takeaway'}</span>
        </div>

        {/* Items summary */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {activeItems.length === 0
            ? <span className="italic text-zinc-400">No active items</span>
            : <>{itemSummary}{extraCount > 0 && <span className="ml-1 text-zinc-400">+{extraCount} more</span>}</>
          }
        </p>
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between gap-2 px-4 pb-3.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <span className="text-base font-black text-brand-500">{currencySymbol}{order.totals.total}</span>
        <button
          onClick={() => onCheckout(order.id)}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-700 hover:bg-brand-500 px-4 py-2 text-[11px] font-black text-white transition-colors cursor-pointer"
        >
          <Receipt className="h-3.5 w-3.5" />
          CHECKOUT
        </button>
      </div>
    </div>
  );
}

// ── Pipeline board ───────────────────────────────────────────────────────────

const PIPELINE_COLUMNS = [
  {
    id: 'placed',
    title: 'Order Placed',
    icon: ClipboardList,
    statuses: ['DRAFT', 'KITCHEN_PENDING'],
    accent: 'border-amber-400',
    headerBg: 'bg-amber-50 dark:bg-amber-900/20',
    headerText: 'text-amber-700 dark:text-amber-400',
    countBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    emptyIcon: 'text-amber-200 dark:text-amber-900',
  },
  {
    id: 'kitchen',
    title: 'In Kitchen',
    icon: FlameKindling,
    statuses: ['PREPARING'],
    accent: 'border-blue-400',
    headerBg: 'bg-blue-50 dark:bg-blue-900/20',
    headerText: 'text-blue-700 dark:text-blue-400',
    countBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    emptyIcon: 'text-blue-200 dark:text-blue-900',
  },
  {
    id: 'checkout',
    title: 'At Checkout',
    icon: CreditCard,
    statuses: ['READY', 'BILL_REQUESTED', 'PARTIALLY_PAID'],
    accent: 'border-purple-400',
    headerBg: 'bg-purple-50 dark:bg-purple-900/20',
    headerText: 'text-purple-700 dark:text-purple-400',
    countBg: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    emptyIcon: 'text-purple-200 dark:text-purple-900',
  },
  {
    id: 'completed',
    title: 'Completed',
    icon: CheckCircle2,
    statuses: ['PAID'],
    accent: 'border-emerald-400',
    headerBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    headerText: 'text-emerald-700 dark:text-emerald-400',
    countBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    emptyIcon: 'text-emerald-200 dark:text-emerald-900',
  },
] as const;

const CANCELLABLE_STATUSES = new Set(['DRAFT', 'KITCHEN_PENDING']);

function PipelineCard({ order, currencySymbol, onCheckout, onCancel, isNew }: {
  order: Order;
  currencySymbol: string;
  onCheckout: (id: string) => void;
  onCancel: (id: string) => void;
  isNew?: boolean;
}) {
  const meta = STATUS_META[order.status] ?? STATUS_META.DRAFT;
  const activeItems = order.items.filter(i => i.status !== 'CANCELLED');
  const itemSummary = activeItems.slice(0, 2).map(i => `${i.menuItem.name} ×${i.quantity}`).join(', ');
  const extraCount = activeItems.length - 2;
  const canCancel = CANCELLABLE_STATUSES.has(order.status);

  return (
    <div className={`flex flex-col rounded-xl border bg-white dark:bg-zinc-900 shadow-sm transition-all duration-150 ${
      isNew
        ? 'border-brand-400 ring-2 ring-brand-400 ring-offset-1 shadow-brand-100 animate-pulse'
        : 'border-zinc-200 dark:border-zinc-800 hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700'
    }`}>
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{order.orderNumber}</span>
        <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400">
          <Clock className="h-2.5 w-2.5" />
          {relativeTime(order.createdAt)}
        </div>
      </div>

      <div className="px-3 py-2.5 space-y-1.5 flex-1">
        <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
          <Table2 className="h-3 w-3 shrink-0" />
          <span>{order.table?.name ?? 'Takeaway'}</span>
        </div>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
          {activeItems.length === 0
            ? <span className="italic">No active items</span>
            : <>{itemSummary}{extraCount > 0 && <span className="ml-1">+{extraCount} more</span>}</>
          }
        </p>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black ${meta.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-3 pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
        <span className="text-sm font-black text-brand-500">{currencySymbol}{order.totals.total}</span>
        <div className={`grid gap-1.5 ${canCancel ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {canCancel && (
            <button
              onClick={() => onCancel(order.id)}
              className="flex items-center justify-center gap-1 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 py-2 text-[10px] font-black transition-colors cursor-pointer"
            >
              <Ban className="h-3 w-3" />
              CANCEL
            </button>
          )}
          <button
            onClick={() => onCheckout(order.id)}
            className="flex items-center justify-center gap-1 rounded-lg bg-zinc-900 dark:bg-zinc-700 hover:bg-brand-500 py-2 text-[10px] font-black text-white transition-colors cursor-pointer"
          >
            <Receipt className="h-3 w-3" />
            CHECKOUT
          </button>
        </div>
      </div>
    </div>
  );
}

function PipelineView({ orders, currencySymbol, onCheckout, onCancel, newOrderId }: {
  orders: Order[];
  currencySymbol: string;
  onCheckout: (id: string) => void;
  onCancel: (id: string) => void;
  newOrderId?: string | null;
}) {
  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4" style={{ scrollbarWidth: 'thin' }}>
      {PIPELINE_COLUMNS.map(col => {
        const colOrders = orders.filter(o => (col.statuses as readonly string[]).includes(o.status));
        const Icon = col.icon;
        return (
          <div key={col.id} className={`flex shrink-0 w-[260px] flex-col rounded-xl border-t-2 ${col.accent} border-x border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 overflow-hidden`}>
            <div className={`flex items-center gap-2 px-3 py-2.5 ${col.headerBg}`}>
              <Icon className={`h-3.5 w-3.5 shrink-0 ${col.headerText}`} />
              <span className={`text-xs font-black ${col.headerText}`}>{col.title}</span>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-black ${col.countBg}`}>{colOrders.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5" style={{ scrollbarWidth: 'none' }}>
              {colOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <Icon className={`h-8 w-8 stroke-[1.2] ${col.emptyIcon}`} />
                  <p className="text-[10px] font-bold text-zinc-400">No orders</p>
                </div>
              ) : (
                colOrders.map(order => (
                  <PipelineCard
                    key={order.id}
                    order={order}
                    currencySymbol={currencySymbol}
                    onCheckout={onCheckout}
                    onCancel={onCancel}
                    isNew={order.id === newOrderId}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    menuItems, cartItems, activeOrders,
    addToCart, updateCartQuantity, updateCartNotes, removeFromCart, clearCart,
    sendOrderToKitchen, fetchMenuItems, fetchActiveOrders, cancelOrder,
    tables, selectedTableId, setSelectedTableId, fetchTables,
  } = usePOSStore();

  const confirm = useConfirmStore((s) => s.confirm);

  // Page mode
  const [mode, setMode] = useState<'list' | 'new-order'>('list');
  const [listView, setListView] = useState<'list' | 'pipeline'>('pipeline');
  const [orderFilter, setOrderFilter] = useState<'ongoing' | 'completed'>('ongoing');

  // New-order mode state
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sendError, setSendError] = useState('');
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [poppedId, setPoppedId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [kitchenFlash, setKitchenFlash] = useState(false);
  const [badgeBounceKey, setBadgeBounceKey] = useState(0);
  const prevCartCount = useRef(0);
  const [restaurantSettings, setRestaurantSettings] = useState<{
    defaultTaxRate: number; defaultServiceCharge: number;
  } | null>(null);

  // List mode state
  const [listLoading, setListLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newOrderId, setNewOrderId] = useState<string | null>(null);

  // Initial load for list mode
  useEffect(() => {
    Promise.all([
      fetchActiveOrders(true, 'today'),
      fetchMenuItems(),
      fetchTables(),
      apiFetch<any>('/auth/restaurant').then(setRestaurantSettings).catch(() => {}),
    ]).finally(() => setListLoading(false));
  }, [fetchMenuItems, fetchTables, fetchActiveOrders]);

  // Auto-refresh in list mode
  useEffect(() => {
    if (mode !== 'list') return;
    const id = setInterval(() => fetchActiveOrders(true, 'today'), 30000);
    return () => clearInterval(id);
  }, [mode, fetchActiveOrders]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchActiveOrders(true, 'today');
    setRefreshing(false);
  };

  // Switch to new-order mode
  const openNewOrder = () => {
    setMenuLoading(true);
    setMode('new-order');
    setMenuLoading(false);
  };

  const backToList = () => {
    setMode('list');
    // Refresh orders so newly created ones show up
    fetchActiveOrders(true, 'today');
  };

  // Checkout navigation
  const handleCheckout = (orderId: string) => {
    router.push(`/checkout?orderId=${orderId}`);
  };

  const handleCancelOrder = (orderId: string) => {
    const order = activeOrders.find(o => o.id === orderId);
    confirm({
      title: 'Cancel Order',
      message: `Cancel ${order?.orderNumber ?? 'this order'}? This cannot be undone.`,
      confirmText: 'Yes, Cancel',
      cancelText: 'Keep Order',
      type: 'danger',
      onConfirm: () => cancelOrder(orderId),
    });
  };

  // Badge bounce
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  useEffect(() => {
    if (cartCount > prevCartCount.current) setBadgeBounceKey(k => k + 1);
    prevCartCount.current = cartCount;
  }, [cartCount]);

  const handleAddToCart = useCallback((item: any) => {
    addToCart(item);
    setPoppedId(item.id);
    setTimeout(() => setPoppedId(null), 300);
  }, [addToCart]);

  const handleRemove = useCallback((itemId: string, qty: number) => {
    if (qty > 1) { updateCartQuantity(itemId, -1); return; }
    setRemovingId(itemId);
    setTimeout(() => { removeFromCart(itemId); setRemovingId(null); }, 260);
  }, [updateCartQuantity, removeFromCart]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setCartSheetOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (mode !== 'new-order') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const inInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
      if ((e.key === '/' || e.key === 'F2') && !inInput) { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.key === 'Escape' && !inInput) backToList();
      if (e.key === 'F9') { e.preventDefault(); router.push('/checkout'); }
      if (e.key === 'F8') { e.preventDefault(); if (cartItems.length > 0) handleSendToKitchen(); }
      if ((e.key === '+' || e.key === '=') && !inInput && cartItems.length > 0) {
        e.preventDefault(); updateCartQuantity(cartItems[cartItems.length - 1].menuItem.id, 1);
      }
      if ((e.key === '-' || e.key === '_') && !inInput && cartItems.length > 0) {
        e.preventDefault();
        const last = cartItems[cartItems.length - 1];
        if (last.quantity > 1) updateCartQuantity(last.menuItem.id, -1);
        else removeFromCart(last.menuItem.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, cartItems, router, updateCartQuantity, removeFromCart]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(menuItems.map(i => i.category)))], [menuItems]);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: menuItems.length };
    menuItems.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return counts;
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => menuItems.filter(item => {
    const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchQ = !q || item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    return matchCat && matchQ;
  }), [menuItems, selectedCategory, searchQuery]);

  const cartTotals = useMemo(() => {
    let subtotal = new Big(0);
    cartItems.forEach((item: CartItem) => { subtotal = subtotal.plus(new Big(item.menuItem.price).times(item.quantity)); });
    const taxRate = restaurantSettings?.defaultTaxRate ?? 5.0;
    const serviceChargeRate = restaurantSettings?.defaultServiceCharge ?? 5.0;
    const tax = subtotal.times(taxRate / 100);
    const sc = subtotal.times(serviceChargeRate / 100);
    return { subtotal: subtotal.toFixed(2), taxRate: taxRate.toString(), serviceChargeRate: serviceChargeRate.toString(), tax: tax.toFixed(2), serviceCharge: sc.toFixed(2), total: subtotal.plus(tax).plus(sc).toFixed(2) };
  }, [cartItems, restaurantSettings]);

  const cartItemCount = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems]);

  const handleSendToKitchen = async () => {
    if (cartItems.length === 0) return;
    setSendError(''); setIsSendingToKitchen(true);
    try {
      const prevIds = new Set(activeOrders.map(o => o.id));
      await sendOrderToKitchen();
      setCartSheetOpen(false);
      // Switch back to pipeline list and highlight the newly placed order
      setMode('list');
      setListView('pipeline');
      // Find the new order (appeared after send) and pulse-highlight it for 3s
      const freshOrders = usePOSStore.getState().activeOrders;
      const justCreated = freshOrders.find(o => !prevIds.has(o.id));
      if (justCreated) {
        setNewOrderId(justCreated.id);
        setTimeout(() => setNewOrderId(null), 3000);
      }
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Failed to send order.');
      setTimeout(() => setSendError(''), 4000);
    } finally { setIsSendingToKitchen(false); }
  };

  // Filtered orders for list mode
  const ongoingOrders = useMemo(() => activeOrders.filter(o => ONGOING_STATUSES.has(o.status)), [activeOrders]);
  const completedOrders = useMemo(() => activeOrders.filter(o => COMPLETED_STATUSES.has(o.status)), [activeOrders]);
  const displayedOrders = orderFilter === 'ongoing' ? ongoingOrders : completedOrders;

  // ── Cart content (shared between sidebar and bottom sheet) ───────────────
  const CartContent = () => (
    <>
      <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Table / Dining Option</label>
        <select
          value={selectedTableId || ''}
          onChange={(e) => setSelectedTableId(e.target.value || null)}
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm font-bold outline-none focus:border-brand-400 dark:text-zinc-100 cursor-pointer"
        >
          <option value="">Takeaway / No Table</option>
          {tables.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.capacity} seats){t.status === 'OCCUPIED' ? ' — Occupied' : t.status === 'RESERVED' ? ' — Reserved' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {cartItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <ShoppingCart className="h-7 w-7 text-zinc-300" />
            </div>
            <p className="text-sm font-bold text-zinc-500">Cart is empty</p>
            <p className="text-xs text-zinc-400 max-w-[160px]">Tap any item to add it to the order</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {cartItems.map(item => (
              <div key={item.menuItem.id}
                className={`flex flex-col px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-950/40 ${removingId === item.menuItem.id ? 'animate-item-out' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl shrink-0">{item.menuItem.image}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.menuItem.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {currencySymbol}{item.menuItem.price.toFixed(2)} × {item.quantity} = <span className="font-extrabold text-zinc-600 dark:text-zinc-300">{currencySymbol}{(item.menuItem.price * item.quantity).toFixed(2)}</span>
                    </p>
                    {item.notes && expandedNoteId !== item.menuItem.id && (
                      <p className="mt-0.5 text-[10px] italic text-amber-600 dark:text-amber-400 truncate">"{item.notes}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleRemove(item.menuItem.id, item.quantity)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 hover:border-red-300 hover:text-red-500 active:scale-95 transition-all cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-black text-zinc-900 dark:text-zinc-100">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.menuItem.id, 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 hover:border-brand-300 hover:text-brand-500 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {expandedNoteId === item.menuItem.id ? (
                  <div className="mt-2 ml-9 flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      maxLength={120}
                      value={item.notes ?? ''}
                      onChange={e => updateCartNotes(item.menuItem.id, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setExpandedNoteId(null); }}
                      placeholder="e.g. no onions, extra spicy…"
                      className="flex-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <button onClick={() => setExpandedNoteId(null)} className="text-[10px] font-black text-zinc-400 hover:text-zinc-600 cursor-pointer shrink-0">Done</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setExpandedNoteId(item.menuItem.id)}
                    className="mt-1.5 ml-9 self-start text-[10px] font-black text-zinc-400 hover:text-amber-500 transition-colors cursor-pointer"
                  >
                    {item.notes ? '✏ Edit note' : '+ Add note'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/40 p-4 space-y-3">
        <div className="space-y-2 text-sm font-bold text-zinc-500 dark:text-zinc-400">
          <div className="flex justify-between"><span>Subtotal</span><span className="text-zinc-800 dark:text-zinc-200">{currencySymbol}{cartTotals.subtotal}</span></div>
          <div className="flex justify-between"><span>Service <span className="text-xs text-zinc-400">({cartTotals.serviceChargeRate}%)</span></span><span className="text-zinc-800 dark:text-zinc-200">{currencySymbol}{cartTotals.serviceCharge}</span></div>
          <div className="flex justify-between"><span>GST <span className="text-xs text-zinc-400">({cartTotals.taxRate}%)</span></span><span className="text-zinc-800 dark:text-zinc-200">{currencySymbol}{cartTotals.tax}</span></div>
          <div className="flex justify-between items-center border-t border-zinc-200 dark:border-zinc-800 pt-2">
            <span className="text-base font-black text-zinc-900 dark:text-zinc-100">Total</span>
            <span className="text-lg font-black text-brand-500">{currencySymbol}{cartTotals.total}</span>
          </div>
        </div>

        <button
          onClick={handleSendToKitchen}
          disabled={cartItems.length === 0 || isSendingToKitchen}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-black text-white transition-all shadow-md ${
            cartItems.length === 0 || isSendingToKitchen
              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed shadow-none'
              : kitchenFlash
              ? 'animate-success-flash cursor-pointer shadow-brand-200'
              : 'bg-brand-500 hover:bg-brand-600 shadow-brand-200 active:scale-[0.98] cursor-pointer'
          }`}
        >
          {isSendingToKitchen
            ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            : <><Send className="h-4 w-4" /><span>SEND TO KITCHEN</span></>}
        </button>

        <button
          onClick={() => { setCartSheetOpen(false); router.push('/checkout'); }}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 py-3 text-sm font-black text-zinc-600 dark:text-zinc-400 hover:border-brand-300 hover:text-brand-500 transition-all cursor-pointer"
        >
          <span>Go to Checkout</span>
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="hidden lg:flex items-center justify-around text-[8px] font-black text-zinc-400 dark:text-zinc-600 select-none uppercase tracking-wider pt-0.5">
          <span>F8 Kitchen</span><span>·</span><span>F9 Checkout</span><span>·</span><span>F2 Search</span><span>·</span><span>Esc Back</span>
        </div>
      </div>
    </>
  );

  // ── LIST MODE ──────────────────────────────────────────────────────────────
  if (mode === 'list') {
    if (listLoading) {
      return <Loader size="md" text="Loading orders..." className="h-full w-full bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800" />;
    }

    return (
      <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">

        {/* Page header */}
        <div className="flex items-center justify-between border-b border-brand-600 bg-gradient-to-r from-brand-500 to-brand-400 px-4 py-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-white" />
            <h2 className="text-xs font-black uppercase tracking-wider text-white">Orders</h2>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black text-white">
              {ongoingOrders.length} ongoing
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={openNewOrder}
              className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-[11px] font-black text-brand-600 hover:bg-brand-50 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              NEW ORDER
            </button>
          </div>
        </div>

        {/* Sub-toolbar: view toggle + (list-only) ongoing/completed tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 px-4 py-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1">
            <button
              onClick={() => setListView('pipeline')}
              title="Pipeline view"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black transition-all cursor-pointer ${
                listView === 'pipeline'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-brand-500'
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Pipeline
            </button>
            <button
              onClick={() => setListView('list')}
              title="List view"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black transition-all cursor-pointer ${
                listView === 'list'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-brand-500'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              List
            </button>
          </div>

          {/* Ongoing / Completed tabs — only visible in list view */}
          {listView === 'list' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOrderFilter('ongoing')}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                  orderFilter === 'ongoing'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-brand-300 hover:text-brand-500'
                }`}
              >
                <UtensilsCrossed className="h-3.5 w-3.5" />
                Ongoing
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none ${
                  orderFilter === 'ongoing' ? 'bg-brand-600 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'
                }`}>{ongoingOrders.length}</span>
              </button>
              <button
                onClick={() => setOrderFilter('completed')}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                  orderFilter === 'completed'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-brand-300 hover:text-brand-500'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none ${
                  orderFilter === 'completed' ? 'bg-brand-600 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'
                }`}>{completedOrders.length}</span>
              </button>
            </div>
          )}
        </div>

        {/* Content: pipeline or list */}
        {listView === 'pipeline' ? (
          <PipelineView
            orders={activeOrders.filter(o => o.status !== 'CANCELLED')}
            currencySymbol={currencySymbol}
            onCheckout={handleCheckout}
            onCancel={handleCancelOrder}
            newOrderId={newOrderId}
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            {displayedOrders.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  {orderFilter === 'ongoing'
                    ? <UtensilsCrossed className="h-7 w-7 text-zinc-300" />
                    : <CheckCircle2 className="h-7 w-7 text-zinc-300" />
                  }
                </div>
                <p className="text-sm font-bold text-zinc-500">
                  {orderFilter === 'ongoing' ? 'No ongoing orders' : 'No completed orders today'}
                </p>
                {orderFilter === 'ongoing' && (
                  <button
                    onClick={openNewOrder}
                    className="mt-1 flex items-center gap-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Order
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {displayedOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    currencySymbol={currencySymbol}
                    onCheckout={handleCheckout}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── NEW ORDER MODE ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full gap-3 overflow-hidden">

      {/* Toasts */}
      <div id="kitchen-alert" className="pointer-events-none fixed right-4 top-16 z-50 flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-brand-200 opacity-0 transition-opacity duration-300">
        <Send className="h-4 w-4" /><span>Order sent to kitchen!</span>
      </div>
      {sendError && (
        <div className="fixed right-4 top-16 z-50 flex items-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white shadow-xl">
          <X className="h-4 w-4" /><span>{sendError}</span>
        </div>
      )}

      {/* Menu panel */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm min-w-0">

        {/* Header with back button */}
        <div className="flex items-center gap-2 border-b border-brand-600 bg-gradient-to-r from-brand-500 to-brand-400 px-3 py-2.5">
          <button
            onClick={backToList}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer shrink-0"
            title="Back to orders (Esc)"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <Soup className="h-4 w-4 text-white" />
          <h2 className="text-xs font-black uppercase tracking-wider text-white">New Order</h2>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black text-white">{filteredMenuItems.length} items</span>
        </div>

        {/* Search */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-2.5 pl-9 pr-9 text-sm font-medium placeholder-zinc-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 text-zinc-900 dark:text-zinc-100"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 px-3 py-2 shrink-0" style={{ scrollbarWidth: 'none' }}>
          {categories.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                  isActive ? 'bg-brand-500 text-white shadow-sm shadow-brand-200' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-brand-300 hover:text-brand-500'
                }`}>
                <span>{cat}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none ${isActive ? 'bg-brand-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                  {categoryCounts[cat] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Menu grid */}
        <div className="flex-1 overflow-y-auto p-3 pb-24 lg:pb-3">
          {filteredMenuItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400">
              <Soup className="h-10 w-10 stroke-[1.2] text-zinc-300" />
              <p className="text-sm font-semibold text-zinc-500">No items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {filteredMenuItems.map(item => {
                const qty = cartItems.find(ci => ci.menuItem.id === item.id)?.quantity || 0;
                const inCart = qty > 0;
                return (
                  <div key={item.id} onClick={() => handleAddToCart(item)}
                    className={`group relative flex flex-col rounded-xl border cursor-pointer transition-all duration-150 select-none overflow-hidden active:scale-[0.97] ${poppedId === item.id ? 'animate-card-pop' : ''} ${
                      inCart ? 'border-brand-400 bg-brand-50/60 dark:bg-brand-950/20 ring-1 ring-brand-400/60 shadow-sm shadow-brand-100' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-brand-300 hover:shadow-sm'
                    }`}>
                    {inCart && (
                      <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-black text-white shadow-sm z-10">{qty}</div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="rounded bg-zinc-100/90 dark:bg-zinc-800/90 px-1.5 py-0.5 text-[8px] font-black uppercase text-zinc-500 dark:text-zinc-400">{item.code}</span>
                    </div>
                    <div className={`flex items-center justify-center pt-8 pb-2 text-4xl transition-transform duration-150 ${!inCart ? 'group-hover:scale-110' : ''}`}>
                      {item.image}
                    </div>
                    <div className="flex-1 px-2.5 pb-2 text-center">
                      <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100 leading-tight line-clamp-2">{item.name}</h3>
                      {item.description && <p className="mt-0.5 text-[9px] text-zinc-400 line-clamp-1">{item.description}</p>}
                    </div>
                    <div className={`flex items-center justify-between px-2.5 py-2.5 border-t transition-colors ${inCart ? 'border-brand-200 dark:border-brand-900/40 bg-brand-500/10' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20'}`}>
                      <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{currencySymbol}{item.price.toFixed(2)}</span>
                      {inCart ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => qty === 1 ? removeFromCart(item.id) : updateCartQuantity(item.id, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 active:scale-[0.92] text-white transition-all cursor-pointer">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-black text-zinc-900 dark:text-zinc-100">{qty}</span>
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 active:scale-[0.92] text-white transition-all cursor-pointer">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-[10px] font-black transition-colors bg-zinc-900 dark:bg-zinc-700 text-white group-hover:bg-brand-500">
                          <Plus className="h-3 w-3" />ADD
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop cart sidebar */}
      <div className="hidden lg:flex w-[300px] xl:w-[320px] shrink-0 flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-700 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-brand-400" />
            <span className="text-xs font-black uppercase tracking-wider text-white">Order</span>
            {cartItemCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-black text-white">{cartItemCount}</span>}
          </div>
          {cartItems.length > 0 && (
            <button onClick={clearCart} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black text-red-300 hover:bg-white/10 transition-colors cursor-pointer">
              <Trash2 className="h-3 w-3" />CLEAR
            </button>
          )}
        </div>
        <CartContent />
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setCartSheetOpen(true)}
        className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl bg-zinc-900 dark:bg-zinc-800 px-5 py-3.5 shadow-2xl shadow-black/30 active:scale-95 transition-all cursor-pointer"
      >
        <div className="relative">
          <ShoppingCart className="h-5 w-5 text-white" />
          {cartItemCount > 0 && (
            <span key={badgeBounceKey} className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[9px] font-black text-white animate-badge-bounce">{cartItemCount}</span>
          )}
        </div>
        <span className="text-sm font-black text-white">
          {cartItemCount === 0 ? 'Cart' : `${cartItemCount} item${cartItemCount > 1 ? 's' : ''}`}
        </span>
        {cartItemCount > 0 && (
          <>
            <span className="text-zinc-500 dark:text-zinc-600">·</span>
            <span className="text-sm font-black text-brand-400">{currencySymbol}{cartTotals.total}</span>
          </>
        )}
      </button>

      {/* Mobile bottom sheet */}
      {cartSheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCartSheetOpen(false)} />
          <div className="relative flex flex-col bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl max-h-[88vh] animate-slide-up">
            <div className="flex flex-col items-center pt-3 pb-0 border-b border-zinc-200 dark:border-zinc-800">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 mb-3" />
              <div className="flex w-full items-center justify-between px-4 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-brand-500" />
                  <span className="text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Order</span>
                  {cartItemCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-black text-white">{cartItemCount}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {cartItems.length > 0 && (
                    <button onClick={clearCart} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-black text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer">
                      <Trash2 className="h-3.5 w-3.5" />CLEAR
                    </button>
                  )}
                  <button onClick={() => setCartSheetOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <CartContent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
