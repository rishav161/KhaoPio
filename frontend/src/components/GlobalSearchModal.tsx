'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { usePOSStore } from '@/store/usePOSStore';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResults {
  menuItems: Array<{
    id: string;
    name: string;
    code: string;
    price: number;
    description?: string;
    isAvailable: boolean;
    category?: { name: string };
  }>;
  orders: Array<{
    id: string;
    orderNumber: number;
    status: string;
    grandTotal: number;
    table?: { name: string };
    waiter?: { name: string };
  }>;
  tables: Array<{
    id: string;
    name: string;
    capacity: number;
    status: string;
  }>;
  staff: Array<{
    id: string;
    name: string;
    email?: string;
    status?: string;
    role?: { name: string };
  }>;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { sidebarItems } = useAuthStore();
  const addToCart = usePOSStore((state) => state.addToCart);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    menuItems: [],
    orders: [],
    tables: [],
    staff: []
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Focus input when modal opens & reset query
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults({ menuItems: [], orders: [], tables: [], staff: [] });
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced API search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ menuItems: [], orders: [], tables: [], staff: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      apiFetch<SearchResults>(`/search?q=${encodeURIComponent(query.trim())}`)
        .then((data) => {
          setResults(data);
          setSelectedIndex(0);
        })
        .catch((err) => {
          console.error('Search failed:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Quick nav actions filtered from available sidebar items
  const quickActions = sidebarItems
    .filter((item) => !query || item.label.toLowerCase().includes(query.toLowerCase()))
    .map((item) => ({
      type: 'action' as const,
      id: item.id,
      title: item.label,
      subtitle: `Navigate to ${item.label}`,
      icon: item.icon || 'Compass',
      path: item.path
    }));

  // Build flattened list of items for arrow key index traversal
  const flatList: Array<{
    type: 'action' | 'menu' | 'order' | 'table' | 'staff';
    id: string;
    title: string;
    subtitle: string;
    badge?: string;
    badgeColor?: string;
    data?: any;
    onSelect: () => void;
  }> = [];

  // Add matching Quick Actions
  quickActions.forEach((act) => {
    flatList.push({
      type: 'action',
      id: act.id,
      title: act.title,
      subtitle: act.subtitle,
      onSelect: () => {
        router.push(act.path);
        onClose();
      }
    });
  });

  // Add Menu Items
  results.menuItems.forEach((item) => {
    flatList.push({
      type: 'menu',
      id: item.id,
      title: `${item.name} (${item.code})`,
      subtitle: `${item.category?.name || 'Menu'} • ₹${item.price.toFixed(2)}${!item.isAvailable ? ' • [Unavailable]' : ''}`,
      badge: item.isAvailable ? 'Available' : 'Unavailable',
      badgeColor: item.isAvailable ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300',
      data: item,
      onSelect: () => {
        if (item.isAvailable) {
          addToCart({
            id: item.id,
            name: item.name,
            price: item.price,
            code: item.code,
            isAvailable: item.isAvailable,
            category: item.category?.name || 'Menu',
            image: '',
            description: item.description || ''
          });
          router.push('/menu');
        } else {
          router.push('/menu');
        }
        onClose();
      }
    });
  });

  // Add Orders
  results.orders.forEach((ord) => {
    flatList.push({
      type: 'order',
      id: ord.id,
      title: `Order #${ord.orderNumber}`,
      subtitle: `${ord.table ? `Table: ${ord.table.name}` : 'Takeaway'} • Waiter: ${ord.waiter?.name || 'N/A'} • Total: ₹${ord.grandTotal.toFixed(2)}`,
      badge: ord.status.replace('_', ' '),
      badgeColor: ord.status === 'READY' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300',
      data: ord,
      onSelect: () => {
        router.push('/orders');
        onClose();
      }
    });
  });

  // Add Tables
  results.tables.forEach((tbl) => {
    flatList.push({
      type: 'table',
      id: tbl.id,
      title: tbl.name,
      subtitle: `Capacity: ${tbl.capacity} seats`,
      badge: tbl.status,
      badgeColor: tbl.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : tbl.status === 'OCCUPIED' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700',
      data: tbl,
      onSelect: () => {
        router.push('/tables');
        onClose();
      }
    });
  });

  // Add Staff
  results.staff.forEach((stf) => {
    flatList.push({
      type: 'staff',
      id: stf.id,
      title: stf.name,
      subtitle: `${stf.role?.name?.replace('_', ' ') || 'Staff'} ${stf.email ? `• ${stf.email}` : ''}`,
      badge: stf.status,
      badgeColor: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300',
      data: stf,
      onSelect: () => {
        router.push('/staff');
        onClose();
      }
    });
  });

  // Keyboard navigation listener
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (flatList.length > 0 ? (prev + 1) % flatList.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (flatList.length > 0 ? (prev - 1 + flatList.length) % flatList.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatList[selectedIndex]) {
        flatList[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-24 px-3 sm:px-4 bg-black/60 backdrop-blur-xs transition-all">
      <div 
        className="fixed inset-0 z-0" 
        onClick={onClose} 
      />

      <div 
        onKeyDown={handleKeyDown}
        className="relative z-10 w-full max-w-3xl lg:max-w-4xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Input Bar */}
        <div className="flex items-center gap-3.5 border-b border-indigo-100/80 dark:border-zinc-800 px-4 py-3.5 bg-white dark:bg-zinc-900 shadow-xs">
          <LucideIcons.Search className="h-5 w-5 text-indigo-500/90 dark:text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu, orders, tables, staff..."
            className="flex-1 bg-transparent text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 caret-indigo-600 focus:outline-none"
          />
          {loading ? (
            <LucideIcons.Loader2 className="h-4 w-4 animate-spin text-indigo-500 shrink-0" />
          ) : (
            <button
              onClick={() => {
                if (query) setQuery('');
                else onClose();
              }}
              className="p-1 rounded-md text-indigo-400/80 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              title="Close search"
            >
              <LucideIcons.X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {flatList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <LucideIcons.SearchX className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                {query ? `No search results found for "${query}"` : 'Type something to search...'}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">
                Try searching for "Pizza", "Table 1", "Order #101", or "Staff"
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Quick Actions Header if items exist */}
              {quickActions.length > 0 && !query && (
                <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                  Quick Navigation Shortcuts
                </div>
              )}

              {flatList.map((item, index) => {
                const isSelected = index === selectedIndex;
                let IconComp = LucideIcons.Compass;

                if (item.type === 'menu') IconComp = LucideIcons.UtensilsCrossed;
                else if (item.type === 'order') IconComp = LucideIcons.Receipt;
                else if (item.type === 'table') IconComp = LucideIcons.Grid;
                else if (item.type === 'staff') IconComp = LucideIcons.Users;

                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                      }`}>
                        <IconComp className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {item.title}
                        </p>
                        <p className={`text-[11px] truncate ${isSelected ? 'text-orange-100' : 'text-zinc-500 dark:text-zinc-400'}`}>
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    {item.badge && (
                      <span className={`ml-2 shrink-0 rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : item.badgeColor || 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Hints */}
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 px-4 py-2 text-[10px] font-bold text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-1 font-mono">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-1 font-mono">↵</kbd> Select
            </span>
          </div>
          <div>
            KhaoPio Global Command Palette
          </div>
        </div>
      </div>
    </div>
  );
};
