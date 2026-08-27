'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
  Utensils, Search, MapPin, Phone, ShoppingBag, Plus, Minus, X, 
  CheckCircle2, Sparkles, ChevronRight, Layers, AlertCircle, ShoppingCart, Clock
} from 'lucide-react';
import { Loader } from '@/components/Loader';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  code: string;
  isAvailable: boolean;
  categoryId: string;
}

interface MenuCategory {
  id: string;
  name: string;
  menuItems: MenuItem[];
}

interface RestaurantInfo {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo: string | null;
  currency: string;
  defaultTaxRate: number;
  defaultServiceCharge: number;
}

interface CartItem {
  item: MenuItem;
  quantity: number;
}

function PublicRestaurantMenuContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const targetId = (params?.restaurantId as string) || 'default';
  const tableQuery = searchParams.get('table') || searchParams.get('tableName') || searchParams.get('tableId') || null;

  // States
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Filters & Search
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive Customer Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [selectedTableNum, setSelectedTableNum] = useState<string>(
    tableQuery ? (tableQuery.startsWith('Table') ? tableQuery : `Table ${tableQuery}`) : 'Table 1'
  );

  // Fetch Public Menu
  useEffect(() => {
    const fetchPublicMenu = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await fetch(`${API_BASE_URL}/menu/public/${targetId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to load restaurant menu.');
        }
        const data = await res.json();
        setRestaurant(data.restaurant);
        setCategories(data.categories || []);
      } catch (err: any) {
        setErrorMsg(err.message || 'Unable to fetch restaurant digital menu.');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicMenu();
  }, [targetId]);

  // Currency symbol map
  const currencySymbol = useMemo(() => {
    if (!restaurant?.currency) return '₹';
    const c = restaurant.currency.toUpperCase();
    if (c === 'USD') return '$';
    if (c === 'EUR') return '€';
    if (c === 'GBP') return '£';
    return '₹';
  }, [restaurant]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) =>
      prev
        .map((ci) => (ci.item.id === itemId ? { ...ci, quantity: ci.quantity - 1 } : ci))
        .filter((ci) => ci.quantity > 0)
    );
  };

  const getItemQuantity = (itemId: string) => {
    return cart.find((ci) => ci.item.id === itemId)?.quantity || 0;
  };

  // Cart Totals
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);
  }, [cart]);

  const totalCartItems = useMemo(() => {
    return cart.reduce((sum, ci) => sum + ci.quantity, 0);
  }, [cart]);

  const taxAmount = useMemo(() => {
    const rate = restaurant?.defaultTaxRate || 5;
    return (cartSubtotal * rate) / 100;
  }, [cartSubtotal, restaurant]);

  const serviceChargeAmount = useMemo(() => {
    const rate = restaurant?.defaultServiceCharge || 5;
    return (cartSubtotal * rate) / 100;
  }, [cartSubtotal, restaurant]);

  const cartGrandTotal = cartSubtotal + taxAmount + serviceChargeAmount;

  // Flattened items for filter/search
  const allItems = useMemo(() => {
    return categories.flatMap((cat) =>
      cat.menuItems.map((item) => ({ ...item, categoryName: cat.name }))
    );
  }, [categories]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesTab = activeTab === 'ALL' || item.categoryId === activeTab;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesTab && matchesSearch;
    });
  }, [allItems, activeTab, searchQuery]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white">
        <Loader size="lg" text="Loading Digital Menu..." />
      </div>
    );
  }

  if (errorMsg || !restaurant) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950 p-6 text-center text-white">
        <div className="max-w-sm rounded-2xl border border-red-900/50 bg-red-950/30 p-6 shadow-2xl backdrop-blur-md">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-3" />
          <h2 className="text-lg font-black uppercase tracking-wider text-red-400">Menu Unavailable</h2>
          <p className="text-xs text-zinc-400 mt-2 font-semibold leading-relaxed">
            {errorMsg || 'Could not locate restaurant menu.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-28">
      
      {/* RESTAURANT HEADER BANNER */}
      <header className="relative overflow-hidden border-b border-zinc-850 bg-gradient-to-b from-brand-950/40 via-zinc-900 to-zinc-950 p-5 shadow-lg">
        <div className="mx-auto max-w-2xl flex flex-col gap-3">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white font-black text-xl shadow-md border border-brand-400/40 select-none overflow-hidden">
                {restaurant.logo && (restaurant.logo.startsWith('http') || restaurant.logo.startsWith('/')) ? (
                  <img src={restaurant.logo} alt={restaurant.name} className="h-full w-full object-cover" />
                ) : (
                  restaurant.logo || '🍽️'
                )}
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>{restaurant.name}</span>
                </h1>
                <p className="text-[11px] font-bold text-brand-400 uppercase tracking-widest">Digital Menu</p>
              </div>
            </div>

            {/* Table Badge */}
            {tableQuery && (
              <div className="flex items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-xs font-black text-brand-400 shadow-xs">
                <MapPin className="h-3.5 w-3.5" />
                <span>{tableQuery.startsWith('Table') ? tableQuery : `Table ${tableQuery}`}</span>
              </div>
            )}
          </div>

          {/* Restaurant Details Info */}
          {(restaurant.address || restaurant.phone) && (
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-semibold text-zinc-400 border-t border-zinc-800/60 mt-1">
              {restaurant.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-zinc-500" />
                  {restaurant.address}
                </span>
              )}
              {restaurant.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-zinc-500" />
                  {restaurant.phone}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* STICKY SEARCH & CATEGORY FILTER TABS */}
      <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-850 p-3 shadow-md">
        <div className="mx-auto max-w-2xl space-y-2.5">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search dishes or codes (e.g. Burger, B01)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-brand-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`rounded-xl px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-850'
              }`}
            >
              All ({allItems.length})
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`rounded-xl px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                  activeTab === cat.id
                    ? 'bg-brand-500 text-white shadow-md'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-850'
                }`}
              >
                {cat.name} ({cat.menuItems.length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DISHES LIST */}
      <main className="mx-auto max-w-2xl p-4">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Utensils className="mx-auto h-10 w-10 text-zinc-700 mb-2" />
            <p className="text-xs font-bold">No dishes found matching search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-2xl border border-zinc-850 bg-zinc-900/60 p-3.5 shadow-sm transition-all hover:border-zinc-750"
                >
                  {/* Dish Icon / Emoji */}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-2xl border border-zinc-800 select-none shadow-xs">
                    {item.image || '🍽️'}
                  </div>

                  {/* Dish Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-black text-white truncate leading-tight">
                        {item.name}
                      </h3>
                      <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-zinc-400 bg-zinc-950 px-1 py-0.5 rounded border border-zinc-800">
                        {item.code}
                      </span>
                    </div>

                    <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description || 'Freshly prepared specialty dish.'}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-xs font-black text-brand-400 font-mono">
                        {currencySymbol}{item.price.toFixed(2)}
                      </span>

                      <span className="text-[9px] font-extrabold uppercase text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                        Available
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FLOATING BOTTOM CART BAR */}
      {totalCartItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full flex items-center justify-between rounded-2xl bg-brand-500 hover:bg-brand-600 text-white p-3.5 shadow-2xl transition-all active:scale-98 cursor-pointer border border-brand-400/40"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-xs font-black">
                {totalCartItems}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-brand-100 uppercase tracking-wider">Your Order</p>
                <p className="text-xs font-black">{totalCartItems} {totalCartItems === 1 ? 'item' : 'items'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-black font-mono">{currencySymbol}{cartGrandTotal.toFixed(2)}</span>
              <ChevronRight className="h-4 w-4 text-brand-100" />
            </div>
          </button>
        </div>
      )}

      {/* CUSTOMER CART MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl text-zinc-100">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-brand-500" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white">My Selected Dishes</h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Table Number Selector */}
            <div className="mb-3 rounded-xl bg-brand-500/10 border border-brand-500/30 p-2.5 text-xs text-brand-400 font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-brand-500" />
                <span>Your Table / Order:</span>
              </div>
              <select
                value={selectedTableNum}
                onChange={(e) => setSelectedTableNum(e.target.value)}
                className="rounded-lg bg-zinc-950 border border-brand-500/40 text-brand-400 py-1 px-2 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="Table 1">Table 1</option>
                <option value="Table 2">Table 2</option>
                <option value="Table 3">Table 3</option>
                <option value="Table 4">Table 4</option>
                <option value="Table 5">Table 5</option>
                <option value="Table 6">Table 6</option>
                <option value="Table 7">Table 7</option>
                <option value="Table 8">Table 8</option>
                <option value="Takeaway">Takeaway</option>
              </select>
            </div>

            {/* Cart Items List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {cart.map(({ item, quantity }) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-850">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg select-none">{item.image || '🍽️'}</span>
                    <div>
                      <h4 className="text-xs font-black text-white">{item.name}</h4>
                      <p className="text-[10px] text-zinc-400 font-mono">{currencySymbol}{item.price.toFixed(2)} × {quantity}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="h-6 w-6 rounded bg-zinc-800 text-zinc-300 flex items-center justify-center"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-black w-4 text-center">{quantity}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="h-6 w-6 rounded bg-brand-500 text-white flex items-center justify-center"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="mt-4 pt-3 border-t border-zinc-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span className="font-mono">{currencySymbol}{cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Taxes ({restaurant.defaultTaxRate}%)</span>
                <span className="font-mono">{currencySymbol}{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Service Charge ({restaurant.defaultServiceCharge}%)</span>
                <span className="font-mono">{currencySymbol}{serviceChargeAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-white pt-2 border-t border-zinc-800 text-sm">
                <span>Total</span>
                <span className="text-brand-400 font-mono">{currencySymbol}{cartGrandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Show staff message */}
            <div className="mt-5">
              <button
                onClick={() => {
                  setOrderPlaced(true);
                  setTimeout(() => {
                    setOrderPlaced(false);
                    setIsCartOpen(false);
                    setCart([]);
                  }, 3000);
                }}
                className="w-full rounded-xl bg-brand-500 hover:bg-brand-600 text-white py-3 text-xs font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer"
              >
                {orderPlaced ? '✓ Shown to Waiter!' : 'Show Selection to Waiter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublicRestaurantMenuPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white">
        <Loader size="lg" text="Loading Digital Menu..." />
      </div>
    }>
      <PublicRestaurantMenuContent />
    </Suspense>
  );
}
