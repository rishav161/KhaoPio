'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { usePOSStore } from '@/store/usePOSStore';
import { CartItem } from '@/types/pos';
import { Search, Plus, Minus, Trash2, Soup, ShoppingCart, Send } from 'lucide-react';
import { Loader } from '@/components/Loader';
import Big from 'big.js';

export default function BillingPage() {
  const {
    menuItems,
    cartItems,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    sendOrderToKitchen,
    fetchMenuItems,
  } = usePOSStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenuItems().finally(() => setLoading(false));
  }, [fetchMenuItems]);

  // Get list of categories dynamically from menuItems
  const categories = useMemo(() => {
    const list = new Set(menuItems.map((item) => item.category));
    return ['All', ...Array.from(list)];
  }, [menuItems]);

  // Compute item count per category for badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: menuItems.length };
    menuItems.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [menuItems]);

  // Filter menu items by selected category and search query
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === '' ||
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Calculate totals for active cart display using big.js (or fallback from store calculations)
  const cartTotals = useMemo(() => {
    let subtotal = new Big(0);
    cartItems.forEach((item: CartItem) => {
      subtotal = subtotal.plus(new Big(item.menuItem.price).times(item.quantity));
    });
    const tax = subtotal.times(0.05); // 5% GST
    const serviceCharge = subtotal.times(0.05); // 5% Service Charge
    const total = subtotal.plus(tax).plus(serviceCharge);

    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      serviceCharge: serviceCharge.toFixed(2),
      total: total.toFixed(2),
    };
  }, [cartItems]);

  const [sendError, setSendError] = useState('');

  if (loading && menuItems.length === 0) {
    return (
      <Loader 
        size="md" 
        text="Loading billing interface..." 
        className="h-full w-full bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800" 
      />
    );
  }

  const handleSendToKitchen = async () => {
    if (cartItems.length === 0) return;
    setSendError('');
    try {
      await sendOrderToKitchen();
      // Quick custom native alert or indicator
      const alertEl = document.getElementById('kitchen-alert');
      if (alertEl) {
        alertEl.classList.remove('opacity-0');
        alertEl.classList.add('opacity-100');
        setTimeout(() => {
          alertEl.classList.remove('opacity-100');
          alertEl.classList.add('opacity-0');
        }, 2000);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send KOT order to kitchen.';
      setSendError(errorMsg);
      setTimeout(() => setSendError(''), 4000);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-3 overflow-y-auto lg:overflow-hidden">
      {/* SUCCESS POPUP ALERT */}
      <div
        id="kitchen-alert"
        className="pointer-events-none fixed right-4 top-16 z-50 flex items-center gap-2 rounded-lg bg-coral-500 px-4 py-3 font-bold text-white shadow-lg opacity-0 transition-opacity duration-300"
      >
        <Send className="h-5 w-5 animate-bounce" />
        <span>Order successfully sent to kitchen!</span>
      </div>

      {/* ERROR POPUP ALERT */}
      {sendError && (
        <div className="fixed right-4 top-16 z-50 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white shadow-lg transition-opacity duration-300">
          <Send className="h-5 w-5" />
          <span>{sendError}</span>
        </div>
      )}

      {/* LEFT COLUMN: Categories (20% width) */}
      <div className="flex w-full lg:w-[20%] flex-col border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden shrink-0">
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Categories</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {categories.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-extrabold transition-all duration-150 ${
                  isActive
                    ? 'bg-coral-500 text-white shadow-sm'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span>{category}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    isActive ? 'bg-coral-600 text-white' : 'bg-zinc-200 dark:bg-zinc-950 text-zinc-650 dark:text-zinc-450'
                  }`}
                >
                  {categoryCounts[category] || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CENTER COLUMN: Menu Grid (50% width) */}
      <div className="flex w-full lg:flex-1 flex-col border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden shrink-0 lg:shrink">
        {/* Search Header */}
        <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 p-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search dishes or item short codes (e.g. B01)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-2 pl-9 pr-4 text-xs font-medium placeholder-zinc-400 dark:placeholder-zinc-500 outline-none transition-all focus:border-coral-500 focus:ring-1 focus:ring-coral-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="rounded-md bg-zinc-200 px-2.5 py-1.5 text-[10px] font-bold text-zinc-700 hover:bg-zinc-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredMenuItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-zinc-400">
              <Soup className="h-10 w-10 stroke-[1.5] text-zinc-300 mb-2" />
              <p className="text-xs font-semibold">No menu items found matching search</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
              {filteredMenuItems.map((item) => {
                const countInCart = cartItems.find((ci) => ci.menuItem.id === item.id)?.quantity || 0;
                return (
                  <div
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className={`relative flex flex-col justify-between rounded-xl border p-2.5 text-left cursor-pointer transition-all duration-150 select-none ${
                      countInCart > 0
                        ? 'border-coral-400 bg-coral-50/40 dark:bg-coral-950/15 ring-1 ring-coral-400'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-850'
                    }`}
                  >
                    {/* Badge for Short Code */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="rounded bg-zinc-100 dark:bg-zinc-950 px-1.5 py-0.5 text-[9px] font-black text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 uppercase">
                        {item.code}
                      </span>
                      {countInCart > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-coral-500 text-[10px] font-black text-white">
                          {countInCart}
                        </span>
                      )}
                    </div>

                    {/* Emoji + Name */}
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">{item.image}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                          {item.name}
                        </h3>
                        <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Price and Add button */}
                    <div className="mt-3 flex items-center justify-between border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-2">
                      <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                        ${item.price.toFixed(2)}
                      </span>
                      <span className="rounded-md bg-zinc-900 dark:bg-zinc-950 px-2 py-1 text-[9px] font-black text-white dark:text-zinc-350 hover:bg-coral-500 transition-colors">
                        ADD +
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart (30% width) */}
      <div className="flex w-full lg:w-[30%] flex-col border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden shrink-0">
        {/* Cart Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3">
          <div className="flex items-center gap-1.5">
            <ShoppingCart className="h-4 w-4 text-coral-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Active Cart</h2>
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="flex items-center gap-1 text-[10px] font-black text-red-500 hover:text-red-700 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              CLEAR
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-zinc-50/50">
          {cartItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-zinc-400 p-4 text-center">
              <ShoppingCart className="h-10 w-10 stroke-[1.2] text-zinc-300 mb-2" />
              <p className="text-xs font-bold text-zinc-500">Cart is empty</p>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-[150px]">
                Click on menu items in the center grid to build an order.
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.menuItem.id}
                className="flex items-center justify-between border border-zinc-200 bg-white p-2 rounded-lg shadow-sm"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{item.menuItem.image}</span>
                    <h4 className="truncate text-xs font-bold text-zinc-800 leading-tight">
                      {item.menuItem.name}
                    </h4>
                  </div>
                  <span className="text-[10px] font-extrabold text-zinc-500">
                    ${item.menuItem.price.toFixed(2)} each
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Quantity Controllers */}
                  <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden bg-zinc-50">
                    <button
                      onClick={() => updateCartQuantity(item.menuItem.id, -1)}
                      className="px-1.5 py-1 text-zinc-600 hover:bg-zinc-200"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-black text-zinc-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.menuItem.id, 1)}
                      className="px-1.5 py-1 text-zinc-600 hover:bg-zinc-200"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.menuItem.id)}
                    className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals Summary & Send to Kitchen Button */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 space-y-2.5">
          <div className="space-y-1.5 text-xs font-bold text-zinc-650 dark:text-zinc-400">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-zinc-900 dark:text-zinc-100">${cartTotals.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                Service Charge <span className="rounded bg-zinc-100 dark:bg-zinc-950 px-1 py-0.5 text-[9px] font-black text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">5%</span>
              </span>
              <span className="text-zinc-900 dark:text-zinc-100">${cartTotals.serviceCharge}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                GST / Tax <span className="rounded bg-zinc-100 dark:bg-zinc-950 px-1 py-0.5 text-[9px] font-black text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">5%</span>
              </span>
              <span className="text-zinc-900 dark:text-zinc-100">${cartTotals.tax}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2 text-sm font-black text-zinc-900 dark:text-zinc-100">
              <span>Total Payable</span>
              <span className="text-coral-500 text-base">${cartTotals.total}</span>
            </div>
          </div>

          <button
            onClick={handleSendToKitchen}
            disabled={cartItems.length === 0}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black text-white transition-all shadow-md ${
              cartItems.length === 0
                ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-505 cursor-not-allowed shadow-none'
                : 'bg-coral-500 hover:bg-coral-600 active:scale-[0.98]'
            }`}
          >
            <Send className="h-4 w-4" />
            SEND TO KITCHEN
          </button>
        </div>
      </div>
    </div>
  );
}
