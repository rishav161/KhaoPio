'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { QRCodeSVG } from 'qrcode.react';
import {
  Edit3, Trash2, Plus, AlertCircle, Check,
  X, Search, Package, Smile, QrCode, Printer, RefreshCw, Star
} from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader } from '@/components/Loader';
import { useConfirmStore } from '@/store/useConfirmStore';
import { useCurrencySymbol } from '@/utils/currency';
import { usePOSStore } from '@/store/usePOSStore';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false }) as React.ComponentType<{
  onEmojiClick: (emojiData: { emoji: string }) => void;
  width?: number | string;
  height?: number | string;
  searchDisabled?: boolean;
  lazyLoadEmojis?: boolean;
  searchPlaceHolder?: string;
  previewConfig?: { showPreview: boolean };
}>;

const PRESET_FOOD_EMOJIS = [
  '🍔', '🍕', '🍟', '🌭', '🥪', '🌮', '🌯', '🫔',
  '🍗', '🥩', '🥓', '🍳', '🥞', '🧇', '🧀', '🥗',
  '🍲', '🥣', '🍜', '🍝', '🍛', '🍱', '🍣', '🍤',
  '🥟', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰',
  '🧁', '🥧', '🍫', '🍬', '☕', '🍵', '🧃', '🥤',
  '🧋', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹'
];

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

export default function MenuPage() {
  const { user } = useAuthStore();
  const confirm = useConfirmStore((state) => state.confirm);
  const currencySymbol = useCurrencySymbol();
  const { permissions } = useAuthStore();
  const canManage = permissions.includes('view:staff'); // Manager/Admin check

  // States
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const pinnedIds = usePOSStore((state) => state.pinnedIds);
  const fetchFavourites = usePOSStore((state) => state.fetchFavourites);
  const pinFavourite = usePOSStore((state) => state.pinFavourite);
  const unpinFavourite = usePOSStore((state) => state.unpinFavourite);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showMasterQrModal, setShowMasterQrModal] = useState(false);
  const [activeQrSlug, setActiveQrSlug] = useState<string>('');

  // Search
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');

  // Category Forms
  const [newCatName, setNewCatName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [catEditingName, setCatEditingName] = useState('');

  // Item Modals & Forms
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    image: '🍔',
    code: '',
    categoryId: '',
    isAvailable: true
  });
  const [itemLoading, setItemLoading] = useState(false);

  // Active Category filter chip
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Fetch Menu from API
  // `showSpinner` is skipped for the initial load: `loading` already starts
  // true and there is no error to clear, so writing that state again would
  // only add a render pass on mount.
  const fetchMenu = async (showSpinner = true) => {
    if (showSpinner) {
      setLoading(true);
      setErrorMsg('');
    }
    try {
      const data = await apiFetch<MenuCategory[]>('/menu');
      setCategories(data);
      if (data.length > 0 && !itemForm.categoryId) {
        setItemForm(prev => ({ ...prev, categoryId: data[0].id }));
      }
    } catch (err) {
      setErrorMsg((err instanceof Error ? err.message : '') || 'Failed to synchronize menu items.');
    } finally {
      setLoading(false);
    }
  };

  // Kicked off on the next frame so the mount render is not restarted by the
  // loading state these set. `loading` already starts true, so the spinner is
  // on screen for that frame regardless.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      fetchMenu(false);
      fetchFavourites();
    });
    return () => cancelAnimationFrame(frame);
  }, [fetchFavourites]);

  // Category Actions
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!newCatName.trim()) return;

    try {
      await apiFetch('/menu/categories', {
        method: 'POST',
        body: { name: newCatName },
      });
      setSuccessMsg(`Created category "${newCatName.trim()}".`);
      setNewCatName('');
      setShowAddCategory(false);
      fetchMenu();
    } catch (err) {
      setErrorMsg((err instanceof Error ? err.message : '') || 'Error creating category.');
    }
  };

  const handleUpdateCategory = async (id: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!catEditingName.trim()) return;

    try {
      await apiFetch(`/menu/categories/${id}`, {
        method: 'PATCH',
        body: { name: catEditingName },
      });
      setSuccessMsg(`Renamed category to "${catEditingName.trim()}".`);
      setCatEditingId(null);
      setCatEditingName('');
      fetchMenu();
    } catch (err) {
      setErrorMsg((err instanceof Error ? err.message : '') || 'Error renaming category.');
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    confirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${name}"? This will permanently delete all its food items!`,
      type: 'danger',
      confirmText: 'Delete Category',
      onConfirm: async () => {
        setErrorMsg('');
        setSuccessMsg('');
        try {
          await apiFetch(`/menu/categories/${id}`, {
            method: 'DELETE',
          });
          setSuccessMsg(`Deleted category "${name}" and its items.`);
          if (activeTab === id) setActiveTab('ALL');
          fetchMenu();
        } catch (err) {
          setErrorMsg((err instanceof Error ? err.message : '') || 'Error deleting category.');
        }
      }
    });
  };

  // Item Actions
  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setShowEmojiPicker(false);
    setItemForm({
      name: '',
      description: '',
      price: '',
      image: '🍔',
      code: '',
      categoryId: categories.length > 0 ? categories[0].id : '',
      isAvailable: true
    });
    setErrorMsg('');
    setSuccessMsg('');
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setShowEmojiPicker(false);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      image: item.image || '🍔',
      code: item.code,
      categoryId: item.categoryId,
      isAvailable: item.isAvailable
    });
    setErrorMsg('');
    setSuccessMsg('');
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setItemLoading(true);

    const priceNum = parseFloat(itemForm.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMsg('Price must be a valid positive number.');
      setItemLoading(false);
      return;
    }

    const selectedCatId = itemForm.categoryId || (categories.length > 0 ? categories[0].id : '');
    if (!selectedCatId) {
      setErrorMsg('Please create at least one category before adding items.');
      setItemLoading(false);
      return;
    }

    try {
      if (editingItem) {
        // Edit Item
        await apiFetch(`/menu/items/${editingItem.id}`, {
          method: 'PATCH',
          body: {
            ...itemForm,
            categoryId: selectedCatId,
            price: priceNum
          }
        });
        setSuccessMsg(`Updated menu item "${itemForm.name}".`);
      } else {
        // Create Item
        await apiFetch('/menu/items', {
          method: 'POST',
          body: {
            ...itemForm,
            categoryId: selectedCatId,
            price: priceNum
          }
        });
        setSuccessMsg(`Added new menu item "${itemForm.name}".`);
      }
      setIsItemModalOpen(false);
      fetchMenu();
    } catch (err) {
      setErrorMsg((err instanceof Error ? err.message : '') || 'Error saving menu item.');
    } finally {
      setItemLoading(false);
    }
  };

  const handleDeleteItem = (id: string, name: string) => {
    confirm({
      title: 'Delete Menu Item',
      message: `Are you sure you want to delete the item "${name}"?`,
      type: 'danger',
      confirmText: 'Delete Item',
      onConfirm: async () => {
        setErrorMsg('');
        setSuccessMsg('');
        try {
          await apiFetch(`/menu/items/${id}`, {
            method: 'DELETE',
          });
          setSuccessMsg(`Successfully deleted item "${name}".`);
          fetchMenu();
        } catch (err) {
          setErrorMsg((err instanceof Error ? err.message : '') || 'Error deleting item.');
        }
      }
    });
  };

  // Pinning only guarantees a slot on the quick-add rail. An unpinned item can
  // still appear there on its own if it is ordered often enough.
  const toggleItemPinned = async (item: MenuItem) => {
    setErrorMsg('');
    setSuccessMsg('');
    const wasPinned = pinnedIds.includes(item.id);
    try {
      if (wasPinned) {
        await unpinFavourite(item.id);
        setSuccessMsg(`Unpinned "${item.name}" from quick add.`);
      } else {
        await pinFavourite(item.id);
        setSuccessMsg(`Pinned "${item.name}" to quick add.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update quick add.');
    }
  };

  const toggleItemAvailability = async (item: MenuItem) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const updatedStatus = !item.isAvailable;
      await apiFetch(`/menu/items/${item.id}`, {
        method: 'PATCH',
        body: { isAvailable: updatedStatus }
      });
      setSuccessMsg(`Marked "${item.name}" as ${updatedStatus ? 'Available' : 'Unavailable'}.`);
      fetchMenu();
    } catch (err) {
      setErrorMsg((err instanceof Error ? err.message : '') || 'Failed to update item status.');
    }
  };

  // Compile flat items list for chip + search filtering
  const allItems = categories.flatMap(cat => cat.menuItems.map(item => ({ ...item, categoryName: cat.name })));
  const visibleItems = allItems.filter(item => {
    const matchesCategory = activeTab === 'ALL' || item.categoryId === activeTab;
    const matchesQuery = query.trim().length === 0 || item.name.toLowerCase().includes(query.trim().toLowerCase());
    return matchesCategory && matchesQuery;
  });

  if (!canManage) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 text-center text-zinc-800 dark:text-zinc-100">
        <div className="max-w-md">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-3" />
          <h2 className="text-lg font-black uppercase tracking-wider">Access Denied</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-semibold">
            Only Super Admins and Store Managers are permitted to edit restaurant menus.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">

      {/* Slim header */}
      <div className="shrink-0 bg-zinc-900 dark:bg-zinc-950 px-5 pb-4 pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black tracking-tight text-white">
              Menu Configuration
            </h1>
            <p className="text-xs text-zinc-400">
              {allItems.length} items · {categories.length} categories
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              aria-label="Search menu"
              onClick={() => setShowSearch((v) => !v)}
              className={`rounded-lg p-2 transition-colors cursor-pointer ${
                showSearch ? 'bg-brand-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Search className="h-4.5 w-4.5" />
            </button>
            <button
              type="button"
              aria-label="Public menu QR"
              title="View & Print Master Menu QR Code"
              onClick={() => setShowMasterQrModal(true)}
              className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20 cursor-pointer"
            >
              <QrCode className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
        {showSearch && (
          <div className="mt-3">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes…"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-brand-400/40"
            />
          </div>
        )}
      </div>

      {/* Category filter chips */}
      <nav aria-label="Menu categories" className="shrink-0 flex items-center gap-2 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 scrollbar-none">
        <CategoryChip
          label={`All Items (${allItems.length})`}
          active={activeTab === 'ALL'}
          onClick={() => setActiveTab('ALL')}
        />
        {categories.map((cat) => {
          const isActive = activeTab === cat.id;
          const isEditingThis = catEditingId === cat.id;

          if (isEditingThis) {
            return (
              <div key={cat.id} className="flex shrink-0 items-center gap-1 rounded-full border border-brand-400 bg-white dark:bg-zinc-900 pl-3 pr-1.5 py-1">
                <input
                  autoFocus
                  value={catEditingName}
                  onChange={(e) => setCatEditingName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(cat.id)}
                  className="w-24 bg-transparent text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none"
                />
                <button onClick={() => handleUpdateCategory(cat.id)} className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer" title="Save">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { setCatEditingId(null); setCatEditingName(''); }} className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer" title="Cancel">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          }

          return (
            <div key={cat.id} className="flex shrink-0 items-center gap-1">
              <CategoryChip
                label={`${cat.name} (${cat.menuItems?.length || 0})`}
                active={isActive}
                onClick={() => setActiveTab(cat.id)}
              />
              {isActive && (
                <span className="flex items-center gap-0.5">
                  <button
                    onClick={() => { setCatEditingId(cat.id); setCatEditingName(cat.name); }}
                    className="p-1 text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer"
                    title="Rename category"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-1 text-zinc-400 hover:text-red-500 cursor-pointer"
                    title="Delete category"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </div>
          );
        })}

        {showAddCategory ? (
          <form onSubmit={handleCreateCategory} className="flex shrink-0 items-center gap-1 rounded-full border border-brand-400 bg-white dark:bg-zinc-900 pl-3 pr-1.5 py-1">
            <input
              autoFocus
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Category name"
              className="w-28 bg-transparent text-xs font-bold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
            />
            <button type="submit" className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer" title="Add">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => { setShowAddCategory(false); setNewCatName(''); }} className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer" title="Cancel">
              <X className="h-3.5 w-3.5" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            aria-label="Add category"
            onClick={() => setShowAddCategory(true)}
            className="shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 p-1.5 text-zinc-500 dark:text-zinc-400 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </nav>

      {/* Success/Error Alert banners */}
      {errorMsg && (
        <div className="shrink-0 mx-4 mt-3 flex items-center justify-between rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-3 text-xs font-bold text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-700 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="shrink-0 mx-4 mt-3 flex items-center justify-between rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <Check className="h-4.5 w-4.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-700 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Compact item list */}
      <main className="flex-1 overflow-y-auto px-3 py-3 bg-zinc-50/40 dark:bg-zinc-950/20">
        {loading ? (
          <Loader size="md" text="Querying active menu items..." className="h-full w-full py-10" />
        ) : (
          <div className="space-y-2">
            {visibleItems.map((item) => (
              <article
                key={item.id}
                className={`flex items-center gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 shadow-sm transition-opacity ${
                  !item.isAvailable ? 'opacity-60' : ''
                }`}
              >
                <div className={`grid h-[60px] w-[60px] shrink-0 place-items-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-3xl ${!item.isAvailable ? 'grayscale' : ''}`}>
                  {item.image || '🍽️'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="shrink-0 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400">
                        {item.code}
                      </span>
                      <h2 className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-50">
                        {item.name}
                      </h2>
                    </div>
                    <span className="shrink-0 text-sm font-black text-brand-600 dark:text-brand-400 font-mono">
                      {currencySymbol}{item.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="mb-2 line-clamp-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {item.description || 'No description provided.'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => handleOpenEditItem(item)}
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${item.name}`}
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-pressed={pinnedIds.includes(item.id)}
                        aria-label={`${pinnedIds.includes(item.id) ? 'Unpin' : 'Pin'} ${item.name} for quick add`}
                        title={pinnedIds.includes(item.id) ? 'Pinned to quick add' : 'Pin to quick add'}
                        onClick={() => toggleItemPinned(item)}
                        className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                          pinnedIds.includes(item.id)
                            ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                            : 'text-zinc-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-500'
                        }`}
                      >
                        <Star className={`h-4 w-4 ${pinnedIds.includes(item.id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${item.isAvailable ? 'text-zinc-400' : 'text-red-500'}`}>
                        {item.isAvailable ? 'Available' : 'Out'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={item.isAvailable}
                        aria-label={`Toggle availability for ${item.name}`}
                        onClick={() => toggleItemAvailability(item)}
                        className={`relative h-4 w-7 rounded-full transition-colors cursor-pointer ${item.isAvailable ? 'bg-brand-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all ${item.isAvailable ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {!loading && visibleItems.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No dishes found</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Try a different category or search term.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom primary actions */}
      <footer className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleOpenCreateItem}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-500 hover:bg-brand-600 py-3 text-sm font-bold text-white shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Menu Item
          </button>
          <button
            type="button"
            aria-label="Public menu QR"
            title="View & Print Master Menu QR Code"
            onClick={() => setShowMasterQrModal(true)}
            className="flex w-14 items-center justify-center rounded-2xl bg-zinc-900 dark:bg-zinc-800 text-white transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-700 cursor-pointer"
          >
            <QrCode className="h-5 w-5" />
          </button>
        </div>
      </footer>

      {/* CREATE/EDIT ITEM MODAL POPUP */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-900 dark:text-zinc-100 max-h-[90vh] overflow-y-auto">

            <button
              onClick={() => setIsItemModalOpen(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-base font-black tracking-tight text-zinc-950 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-4 flex items-center gap-1.5">
              <Package className="h-5 w-5 text-brand-500" />
              <span>{editingItem ? 'Edit Dish Details' : 'Create New Menu Item'}</span>
            </h2>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="e.g. Garlic Naan"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2 px-3 text-xs outline-none focus:border-brand-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                    Short Code
                  </label>
                  <input
                    type="text"
                    value={itemForm.code}
                    onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                    placeholder="e.g. G02"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2 px-3 text-xs outline-none focus:border-brand-400 font-mono tracking-widest text-center"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  Description
                </label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Provide ingredients, cooking preparation details..."
                  className="w-full h-18 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-1.5 px-3 text-xs outline-none focus:border-brand-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                    Price ({currencySymbol})
                  </label>
                  <input
                    type="text"
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value.replace(/[^0-9.]/g, '') })}
                    placeholder="5.99"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2 px-3 text-xs outline-none focus:border-brand-400 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 flex items-center justify-between">
                    <span>Dish Icon</span>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-brand-500 hover:underline flex items-center gap-0.5 cursor-pointer lowercase font-bold"
                    >
                      <Smile className="h-3 w-3" />
                      <span>{showEmojiPicker ? 'close' : 'browse'}</span>
                    </button>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center text-xl shrink-0 cursor-pointer hover:border-brand-400 transition-colors shadow-xs"
                      title="Click to select food icon"
                    >
                      {itemForm.image || '🍽️'}
                    </button>
                    <input
                      type="text"
                      value={itemForm.image}
                      onChange={(e) => setItemForm({ ...itemForm, image: e.target.value })}
                      placeholder="e.g. 🍔 or URL"
                      className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2 px-2.5 text-xs outline-none focus:border-brand-400"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Preset Food Icons Bar */}
              <div>
                <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  Quick Select Food Icon
                </label>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40 scrollbar-thin">
                  {PRESET_FOOD_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setItemForm({ ...itemForm, image: emoji });
                        setShowEmojiPicker(false);
                      }}
                      className={`h-7 w-7 rounded-md text-base flex items-center justify-center transition-all cursor-pointer ${
                        itemForm.image === emoji
                          ? 'bg-brand-500 text-white shadow-xs scale-110'
                          : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:scale-105'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Searchable Emoji Picker Drawer */}
              {showEmojiPicker && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-150">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      setItemForm({ ...itemForm, image: emojiData.emoji });
                      setShowEmojiPicker(false);
                    }}
                    width="100%"
                    height={300}
                    lazyLoadEmojis={true}
                    searchPlaceHolder="Search food, drinks, icons..."
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  Menu Category
                </label>
                <select
                  value={itemForm.categoryId || (categories.length > 0 ? categories[0].id : '')}
                  onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2 px-3 text-xs outline-none focus:border-brand-400"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="modalIsAvailable"
                  checked={itemForm.isAvailable}
                  onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                  className="h-4.5 w-4.5 rounded border-zinc-300 bg-zinc-50 dark:bg-zinc-950 text-brand-500 focus:ring-2 focus:ring-brand-400/20"
                />
                <label htmlFor="modalIsAvailable" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                  Make this dish available for order immediately
                </label>
              </div>

              <div className="flex gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-800 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={itemLoading}
                  className="flex-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white py-2.5 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  {itemLoading ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MASTER PUBLIC MENU QR CODE MODAL */}
      {showMasterQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100">

            <button
              onClick={() => setShowMasterQrModal(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white text-xl font-black shadow-md border border-brand-400">
                🍽️
              </div>
              <h2 className="text-lg font-black tracking-tight text-zinc-950 dark:text-zinc-50">
                {user?.restaurantName || 'KhaoPio Restaurant'}
              </h2>
              <p className="text-xs font-bold text-brand-500 uppercase tracking-widest mt-0.5">
                Master Public Digital Menu QR Code
              </p>
            </div>

            {/* QR Code Container */}
            <div className="my-5 flex flex-col items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-5 shadow-inner">
              <div className="bg-white p-3.5 rounded-xl shadow-md border border-zinc-200">
                <QRCodeSVG
                  value={typeof window !== 'undefined' ? `${window.location.origin}/m/${activeQrSlug || user?.restaurantId || 'default'}` : ''}
                  size={170}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="mt-3 text-center">
                <p className="text-xs font-black uppercase text-zinc-800 dark:text-zinc-200 tracking-wider flex items-center justify-center gap-1">
                  <QrCode className="h-3.5 w-3.5 text-brand-500" />
                  <span>Scan to View Live Menu</span>
                </p>
                <p className="text-[9px] text-zinc-400 mt-1 font-mono break-all max-w-[240px]">
                  {typeof window !== 'undefined' ? `${window.location.origin}/m/${activeQrSlug || user?.restaurantId || 'default'}` : ''}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowMasterQrModal(false)}
                  className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-800 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    const url = `${origin}/m/${activeQrSlug || user?.restaurantId || 'default'}`;
                    const restName = user?.restaurantName || 'KhaoPio Restaurant';
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return;

                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Master Menu QR - ${restName}</title>
                          <style>
                            @media print {
                              @page { size: 4in 6in; margin: 0; }
                              body { margin: 0; }
                            }
                            body {
                              font-family: system-ui, -apple-system, sans-serif;
                              display: flex;
                              flex-direction: column;
                              align-items: center;
                              justify-content: center;
                              height: 100vh;
                              margin: 0;
                              padding: 20px;
                              box-sizing: border-box;
                              text-align: center;
                              background: #fff;
                              color: #18181b;
                            }
                            .card {
                              border: 3px solid #3b5a73;
                              border-radius: 24px;
                              padding: 28px;
                              width: 100%;
                              max-width: 320px;
                              box-sizing: border-box;
                              box-shadow: 0 10px 30px rgba(0,0,0,0.12);
                            }
                            .logo { font-size: 36px; margin-bottom: 4px; }
                            .title { font-size: 22px; font-weight: 900; margin: 0 0 4px 0; color: #09090b; }
                            .subtitle { font-size: 11px; font-weight: 800; color: #3b5a73; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; }
                            .qr-box { background: #fafafa; border: 2px dashed #e4e4e7; border-radius: 16px; padding: 16px; display: inline-block; margin-bottom: 16px; }
                            .instruction { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #27272a; margin: 0; }
                            .url { font-size: 9px; color: #a1a1aa; word-break: break-all; margin-top: 8px; font-family: monospace; }
                          </style>
                        </head>
                        <body>
                          <div class="card">
                            <div class="logo">🍽️</div>
                            <h1 class="title">${restName}</h1>
                            <div class="subtitle">Digital Menu & Ordering</div>

                            <div class="qr-box">
                              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" width="180" height="180" alt="QR Code" />
                            </div>

                            <p class="instruction">📷 Scan with Smartphone Camera</p>
                            <div class="url">${url}</div>
                          </div>
                          <script>
                            window.onload = function() {
                              window.print();
                              setTimeout(function() { window.close(); }, 500);
                            };
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white py-2.5 text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  Print QR Card
                </button>
              </div>

              {/* Regenerate & Revoke Old QR Button */}
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    confirm({
                      title: 'Regenerate QR Code & Revoke Old?',
                      message: 'Are you sure you want to generate a new QR Code? All previously printed physical QR posters will immediately be revoked and stop working!',
                      type: 'danger',
                      confirmText: 'Regenerate & Revoke Old',
                      onConfirm: async () => {
                        try {
                          const res = await apiFetch<{ qrSlug: string; message: string }>('/menu/regenerate-qr', {
                            method: 'POST',
                          });
                          setActiveQrSlug(res.qrSlug);
                          setSuccessMsg('QR Code successfully regenerated! Old printed QR codes are now revoked.');
                        } catch (err) {
                          setErrorMsg((err instanceof Error ? err.message : '') || 'Error regenerating QR code.');
                        }
                      },
                    });
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 py-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer mt-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Regenerate QR (Revoke Old Posters)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
        active
          ? 'bg-brand-500 text-white'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
      }`}
    >
      {label}
    </button>
  );
}
