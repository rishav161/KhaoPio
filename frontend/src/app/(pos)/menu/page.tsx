'use client';

import React, { useState, useEffect } from 'react';
import { 
  FolderPlus, Edit3, Trash2, Plus, Sparkles, AlertCircle, Check, 
  X, ClipboardCheck, ArrowRight, Eye, EyeOff, LayoutGrid, Tag, 
  Layers, Package, Coins, Hash, RefreshCw, ToggleLeft, ToggleRight
} from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader } from '@/components/Loader';

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

export default function MenuManagement() {
  const { permissions } = useAuthStore();
  const canManage = permissions.includes('view:staff'); // Manager/Admin check

  // States
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Category Forms
  const [newCatName, setNewCatName] = useState('');
  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [catEditingName, setCatEditingName] = useState('');

  // Item Modals & Forms
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
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

  // Active Category tab filter on items grid
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Fetch Menu from API
  const fetchMenu = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiFetch<MenuCategory[]>('/menu');
      setCategories(data);
      if (data.length > 0 && !itemForm.categoryId) {
        setItemForm(prev => ({ ...prev, categoryId: data[0].id }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to synchronize menu items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

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
      fetchMenu();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating category.');
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Error renaming category.');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the category "${name}"? This will permanently delete all its food items!`)) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await apiFetch(`/menu/categories/${id}`, {
        method: 'DELETE',
      });
      setSuccessMsg(`Deleted category "${name}" and its items.`);
      fetchMenu();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting category.');
    }
  };

  // Item Actions
  const handleOpenCreateItem = () => {
    setEditingItem(null);
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving menu item.');
    } finally {
      setItemLoading(false);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the item "${name}"?`)) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await apiFetch(`/menu/items/${id}`, {
        method: 'DELETE',
      });
      setSuccessMsg(`Successfully deleted item "${name}".`);
      fetchMenu();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting item.');
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update item status.');
    }
  };

  // Compile flat items list for tab filtering
  const allItems = categories.flatMap(cat => cat.menuItems.map(item => ({ ...item, categoryName: cat.name })));
  const filteredItems = activeTab === 'ALL' 
    ? allItems 
    : allItems.filter(item => item.categoryId === activeTab);

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
    <div className="flex h-full flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-250">
      
      {/* Title Header */}
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <Layers className="h-6 w-6 text-coral-500" />
            <span>Menu Configuration</span>
          </h1>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Define kitchen categories, publish dishes, manage pricing, and toggle menu availability.
          </p>
        </div>
        
        <button
          onClick={handleOpenCreateItem}
          className="flex items-center gap-1.5 self-start rounded-lg bg-coral-500 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-coral-100 dark:shadow-none hover:bg-coral-600 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Add Menu Item</span>
        </button>
      </div>

      {/* Success/Error Alert banners */}
      {errorMsg && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-3.5 text-xs font-bold text-red-605 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-750 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 p-3.5 text-xs font-bold text-emerald-700 dark:text-emerald-450">
          <div className="flex items-center gap-2">
            <Check className="h-4.5 w-4.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-750 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main dashboard configuration workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        
        {/* LEFT COLUMN: Categories list management console */}
        <div className="lg:col-span-1 flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Menu Categories
            </h2>
            <Layers className="h-4 w-4 text-zinc-400" />
          </div>

          {/* Add Category Form */}
          <form onSubmit={handleCreateCategory} className="p-3 border-b border-zinc-200 dark:border-zinc-850">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New Category..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-1.5 px-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-coral-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-coral-500 text-white p-2 hover:bg-coral-600 transition-colors cursor-pointer"
                title="Add Category"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Categories list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-zinc-50/20 dark:bg-zinc-900/10">
            {categories.map((cat) => {
              const isEditing = catEditingId === cat.id;

              return (
                <div 
                  key={cat.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 mr-2">
                      <input
                        type="text"
                        value={catEditingName}
                        onChange={(e) => setCatEditingName(e.target.value)}
                        className="flex-1 rounded border border-zinc-300 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 py-0.5 px-2 text-xs outline-none"
                      />
                      <button 
                        onClick={() => handleUpdateCategory(cat.id)}
                        className="text-emerald-600 hover:text-emerald-700 p-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => { setCatEditingId(null); setCatEditingName(''); }}
                        className="text-zinc-400 hover:text-zinc-600 p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black truncate text-zinc-905 dark:text-zinc-50">
                        {cat.name}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-bold">
                        {cat.menuItems?.length || 0} items
                      </span>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setCatEditingId(cat.id);
                          setCatEditingName(cat.name);
                        }}
                        className="text-zinc-450 hover:text-coral-500 dark:hover:text-coral-400 p-1 transition-colors cursor-pointer"
                        title="Rename"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="text-zinc-450 hover:text-red-500 p-1 transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Food Items filtering and grid list */}
        <div className="lg:col-span-2 flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          
          {/* Header filter tabs */}
          <div className="p-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 overflow-x-auto flex gap-1.5 scrollbar-none">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                activeTab === 'ALL'
                  ? 'bg-coral-500 text-white shadow-sm'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-550 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              All Items ({allItems.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                  activeTab === cat.id
                    ? 'bg-coral-500 text-white shadow-sm'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-550 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {cat.name} ({cat.menuItems?.length || 0})
              </button>
            ))}
          </div>

          {/* Grid listing */}
          <div className="flex-1 overflow-y-auto p-4 bg-zinc-50/20 dark:bg-zinc-900/10">
            {loading ? (
              <Loader size="md" text="Querying active menu items..." className="h-full w-full py-10" />
            ) : filteredItems.length === 0 ? (
              <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 mb-3">
                  <Package className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-550">No Menu Items Found</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Add items to this category or seed templates.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredItems.map((item) => (
                  <div 
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border bg-white dark:bg-zinc-900 shadow-sm transition-all ${
                      item.isAvailable 
                        ? 'border-zinc-200 dark:border-zinc-800' 
                        : 'border-red-200 dark:border-red-955 opacity-70 bg-zinc-50/50 dark:bg-zinc-950/20'
                    }`}
                  >
                    {/* Item Image / Emoji */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-950 text-2xl border border-zinc-200 dark:border-zinc-800 select-none">
                      {item.image || '🍽️'}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-zinc-950 dark:text-zinc-50 truncate leading-tight">
                          {item.name}
                        </span>
                        <span className="text-[8px] font-mono font-black uppercase tracking-widest text-zinc-400 bg-zinc-100 dark:bg-zinc-950 px-1 py-0.5 rounded">
                          {item.code}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {item.description || 'No description provided.'}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-black text-coral-500 font-mono">
                          ${item.price.toFixed(2)}
                        </span>

                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${
                          item.isAvailable
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-200 dark:border-emerald-900'
                            : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900'
                        }`}>
                          {item.isAvailable ? 'Available' : 'Sold Out'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons (flex aligned) */}
                    <div className="flex flex-col gap-1.5 shrink-0 self-stretch justify-center items-center border-l border-zinc-100 dark:border-zinc-800 pl-2.5">
                      <button
                        onClick={() => toggleItemAvailability(item)}
                        className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                          item.isAvailable ? 'text-emerald-500' : 'text-zinc-400'
                        }`}
                        title={item.isAvailable ? 'Mark Sold Out' : 'Mark Available'}
                      >
                        {item.isAvailable ? <ToggleRight className="h-4.5 w-4.5" /> : <ToggleLeft className="h-4.5 w-4.5" />}
                      </button>
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="p-1 rounded text-zinc-450 hover:text-coral-500 dark:hover:text-coral-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="p-1 rounded text-zinc-450 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE/EDIT ITEM MODAL POPUP */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-900 dark:text-zinc-100">
            
            <button
              onClick={() => setIsItemModalOpen(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-250 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-base font-black tracking-tight text-zinc-950 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-4 flex items-center gap-1.5">
              <Package className="h-5 w-5 text-coral-500" />
              <span>{editingItem ? 'Edit Dish Details' : 'Create New Menu Item'}</span>
            </h2>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-450 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="e.g. Garlic Naan"
                    className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2 px-3 text-xs outline-none focus:border-coral-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-450 mb-1">
                    Short Code
                  </label>
                  <input
                    type="text"
                    value={itemForm.code}
                    onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                    placeholder="e.g. G02"
                    className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2 px-3 text-xs outline-none focus:border-coral-500 font-mono tracking-widest text-center"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-450 mb-1">
                  Description
                </label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Provide ingredients, cooking preparation details..."
                  className="w-full h-18 rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-1.5 px-3 text-xs outline-none focus:border-coral-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-450 mb-1">
                    Price ($)
                  </label>
                  <input
                    type="text"
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value.replace(/[^0-9.]/g, '') })}
                    placeholder="5.99"
                    className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2 px-3 text-xs outline-none focus:border-coral-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-450 mb-1">
                    Image / Emoji
                  </label>
                  <input
                    type="text"
                    value={itemForm.image}
                    onChange={(e) => setItemForm({ ...itemForm, image: e.target.value })}
                    placeholder="🍲"
                    className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2 px-3 text-xs outline-none focus:border-coral-500 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-450 mb-1">
                  Menu Category
                </label>
                <select
                  value={itemForm.categoryId || (categories.length > 0 ? categories[0].id : '')}
                  onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                  className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2 px-3 text-xs outline-none focus:border-coral-500"
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
                  className="h-4.5 w-4.5 rounded border-zinc-350 bg-zinc-50 dark:bg-zinc-950 text-coral-500 focus:ring-1 focus:ring-coral-500"
                />
                <label htmlFor="modalIsAvailable" className="text-xs font-bold text-zinc-700 dark:text-zinc-350 cursor-pointer select-none">
                  Make this dish available for order immediately
                </label>
              </div>

              <div className="flex gap-3 border-t border-zinc-150 dark:border-zinc-800 pt-4 mt-6">
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
                  className="flex-1 rounded-lg bg-coral-500 hover:bg-coral-600 text-white py-2.5 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  {itemLoading ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
