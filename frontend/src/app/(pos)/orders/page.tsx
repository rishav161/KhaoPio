'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePOSStore } from '@/store/usePOSStore';
import { CartItem } from '@/types/pos';
import { Search, Plus, Minus, Trash2, Soup, ShoppingCart, Send, X, ChevronRight } from 'lucide-react';
import { Loader } from '@/components/Loader';
import { apiFetch } from '@/utils/api';
import { useCurrencySymbol } from '@/utils/currency';
import Big from 'big.js';

export default function OrdersPage() {
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    menuItems, cartItems,
    addToCart, updateCartQuantity, removeFromCart, clearCart,
    sendOrderToKitchen, fetchMenuItems,
    tables, selectedTableId, setSelectedTableId, fetchTables,
  } = usePOSStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    Promise.all([
      fetchMenuItems(),
      fetchTables(),
      apiFetch<any>('/auth/restaurant').then(setRestaurantSettings).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [fetchMenuItems, fetchTables]);

  // Badge bounce when cart grows — runs after cartItemCount is computed
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  useEffect(() => {
    if (cartCount > prevCartCount.current) setBadgeBounceKey(k => k + 1);
    prevCartCount.current = cartCount;
  }, [cartCount]);

  // Add-to-cart pop feedback
  const handleAddToCart = useCallback((item: any) => {
    addToCart(item);
    setPoppedId(item.id);
    setTimeout(() => setPoppedId(null), 300);
  }, [addToCart]);

  // Remove with slide-out animation
  const handleRemove = useCallback((itemId: string, qty: number) => {
    if (qty > 1) { updateCartQuantity(itemId, -1); return; }
    setRemovingId(itemId);
    setTimeout(() => { removeFromCart(itemId); setRemovingId(null); }, 260);
  }, [updateCartQuantity, removeFromCart]);

  // Close cart sheet on desktop resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setCartSheetOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Keyboard shortcuts (desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const inInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
      if ((e.key === '/' || e.key === 'F2') && !inInput) { e.preventDefault(); searchInputRef.current?.focus(); }
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
  }, [cartItems, router, updateCartQuantity, removeFromCart]);

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
      await sendOrderToKitchen();
      setCartSheetOpen(false);
      setKitchenFlash(true);
      setTimeout(() => setKitchenFlash(false), 700);
      const el = document.getElementById('kitchen-alert');
      if (el) {
        el.classList.remove('opacity-0'); el.classList.add('opacity-100');
        setTimeout(() => { el.classList.remove('opacity-100'); el.classList.add('opacity-0'); }, 2200);
      }
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Failed to send order.');
      setTimeout(() => setSendError(''), 4000);
    } finally { setIsSendingToKitchen(false); }
  };

  if (loading && menuItems.length === 0) {
    return <Loader size="md" text="Loading menu..." className="h-full w-full bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800" />;
  }

  // ── Shared cart panel content (used in both sidebar and bottom sheet) ──
  const CartContent = () => (
    <>
      {/* Table selector */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Table / Dining Option</label>
        <select
          value={selectedTableId || ''}
          onChange={(e) => setSelectedTableId(e.target.value || null)}
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm font-bold outline-none focus:border-orange-400 dark:text-zinc-100 cursor-pointer"
        >
          <option value="">Takeaway / No Table</option>
          {tables.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.capacity} seats){t.status === 'OCCUPIED' ? ' — Occupied' : t.status === 'RESERVED' ? ' — Reserved' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Cart items */}
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
                className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-950/40 ${removingId === item.menuItem.id ? 'animate-item-out' : ''}`}>
                <span className="text-2xl shrink-0">{item.menuItem.image}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.menuItem.name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {currencySymbol}{item.menuItem.price.toFixed(2)} × {item.quantity} = <span className="font-extrabold text-zinc-600 dark:text-zinc-300">{currencySymbol}{(item.menuItem.price * item.quantity).toFixed(2)}</span>
                  </p>
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
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 hover:border-orange-300 hover:text-orange-500 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals + actions */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/40 p-4 space-y-3">
        <div className="space-y-2 text-sm font-bold text-zinc-500 dark:text-zinc-400">
          <div className="flex justify-between"><span>Subtotal</span><span className="text-zinc-800 dark:text-zinc-200">{currencySymbol}{cartTotals.subtotal}</span></div>
          <div className="flex justify-between"><span>Service <span className="text-xs text-zinc-400">({cartTotals.serviceChargeRate}%)</span></span><span className="text-zinc-800 dark:text-zinc-200">{currencySymbol}{cartTotals.serviceCharge}</span></div>
          <div className="flex justify-between"><span>GST <span className="text-xs text-zinc-400">({cartTotals.taxRate}%)</span></span><span className="text-zinc-800 dark:text-zinc-200">{currencySymbol}{cartTotals.tax}</span></div>
          <div className="flex justify-between items-center border-t border-zinc-200 dark:border-zinc-800 pt-2">
            <span className="text-base font-black text-zinc-900 dark:text-zinc-100">Total</span>
            <span className="text-lg font-black text-orange-500">{currencySymbol}{cartTotals.total}</span>
          </div>
        </div>

        <button
          onClick={handleSendToKitchen}
          disabled={cartItems.length === 0 || isSendingToKitchen}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-black text-white transition-all shadow-md ${
            cartItems.length === 0 || isSendingToKitchen
              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed shadow-none'
              : kitchenFlash
              ? 'animate-success-flash cursor-pointer shadow-orange-200'
              : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200 active:scale-[0.98] cursor-pointer'
          }`}
        >
          {isSendingToKitchen
            ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            : <><Send className="h-4 w-4" /><span>SEND TO KITCHEN</span></>}
        </button>

        <button
          onClick={() => { setCartSheetOpen(false); router.push('/checkout'); }}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 py-3 text-sm font-black text-zinc-600 dark:text-zinc-400 hover:border-orange-300 hover:text-orange-500 transition-all cursor-pointer"
        >
          <span>Go to Checkout</span>
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="hidden lg:flex items-center justify-around text-[8px] font-black text-zinc-400 dark:text-zinc-600 select-none uppercase tracking-wider pt-0.5">
          <span>F8 Kitchen</span><span>·</span><span>F9 Checkout</span><span>·</span><span>F2 Search</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-full w-full gap-3 overflow-hidden">

      {/* Toast alerts */}
      <div id="kitchen-alert" className="pointer-events-none fixed right-4 top-16 z-50 flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-orange-200 opacity-0 transition-opacity duration-300">
        <Send className="h-4 w-4" /><span>Order sent to kitchen!</span>
      </div>
      {sendError && (
        <div className="fixed right-4 top-16 z-50 flex items-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white shadow-xl">
          <X className="h-4 w-4" /><span>{sendError}</span>
        </div>
      )}

      {/* ── Menu panel (full width on mobile, flex-1 on desktop) ── */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm min-w-0">

        {/* Search bar */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-2.5 pl-9 pr-9 text-sm font-medium placeholder-zinc-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 text-zinc-900 dark:text-zinc-100"
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
                  isActive ? 'bg-orange-500 text-white shadow-sm shadow-orange-200' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-orange-300 hover:text-orange-500'
                }`}>
                <span>{cat}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none ${isActive ? 'bg-orange-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                  {categoryCounts[cat] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Menu grid — extra bottom padding on mobile for FAB */}
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
                      inCart ? 'border-orange-400 bg-orange-50/60 dark:bg-orange-950/20 ring-1 ring-orange-400/60 shadow-sm shadow-orange-100' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-orange-300 hover:shadow-sm'
                    }`}>
                    {inCart && (
                      <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-white shadow-sm z-10">{qty}</div>
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
                    <div className={`flex items-center justify-between px-2.5 py-2.5 border-t transition-colors ${inCart ? 'border-orange-200 dark:border-orange-900/40 bg-orange-500/10' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20'}`}>
                      <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{currencySymbol}{item.price.toFixed(2)}</span>
                      <span className={`flex items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-[10px] font-black transition-colors ${inCart ? 'bg-orange-500 text-white' : 'bg-zinc-900 dark:bg-zinc-700 text-white group-hover:bg-orange-500'}`}>
                        <Plus className="h-3 w-3" />ADD
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP: Cart sidebar (lg+) ── */}
      <div className="hidden lg:flex w-[300px] xl:w-[320px] shrink-0 flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Order</span>
            {cartItemCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-white">{cartItemCount}</span>}
          </div>
          {cartItems.length > 0 && (
            <button onClick={clearCart} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 transition-colors cursor-pointer">
              <Trash2 className="h-3 w-3" />CLEAR
            </button>
          )}
        </div>
        <CartContent />
      </div>

      {/* ── MOBILE/TABLET: Floating cart button (< lg) ── */}
      <button
        onClick={() => setCartSheetOpen(true)}
        className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl bg-zinc-900 dark:bg-zinc-800 px-5 py-3.5 shadow-2xl shadow-black/30 active:scale-95 transition-all cursor-pointer"
      >
        <div className="relative">
          <ShoppingCart className="h-5 w-5 text-white" />
          {cartItemCount > 0 && (
            <span key={badgeBounceKey} className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[9px] font-black text-white animate-badge-bounce">{cartItemCount}</span>
          )}
        </div>
        <span className="text-sm font-black text-white">
          {cartItemCount === 0 ? 'Cart' : `${cartItemCount} item${cartItemCount > 1 ? 's' : ''}`}
        </span>
        {cartItemCount > 0 && (
          <>
            <span className="text-zinc-500 dark:text-zinc-600">·</span>
            <span className="text-sm font-black text-orange-400">{currencySymbol}{cartTotals.total}</span>
          </>
        )}
      </button>

      {/* ── MOBILE/TABLET: Cart bottom sheet ── */}
      {cartSheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCartSheetOpen(false)} />

          {/* Sheet */}
          <div className="relative flex flex-col bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl max-h-[88vh] animate-slide-up">
            {/* Drag handle + header */}
            <div className="flex flex-col items-center pt-3 pb-0 border-b border-zinc-200 dark:border-zinc-800">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 mb-3" />
              <div className="flex w-full items-center justify-between px-4 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-orange-500" />
                  <span className="text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Order</span>
                  {cartItemCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-white">{cartItemCount}</span>}
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
