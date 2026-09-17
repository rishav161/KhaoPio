'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Shield, Check, AlertCircle, Sparkles, Copy, 
  Utensils, LayoutGrid, BookOpen, Users, BarChart3 
} from 'lucide-react';
import { apiFetch } from '@/utils/api';

export interface PermissionDefinition {
  name: string;
  category: string;
  label: string;
  description: string;
}

export interface CategoryDefinition {
  key: string;
  label: string;
  icon: string;
  permissions: PermissionDefinition[];
}

export interface CatalogData {
  permissions: PermissionDefinition[];
  categories: CategoryDefinition[];
  systemRoleDefaults: Record<string, string[]>;
}

export interface RoleItem {
  id: string;
  name: string;
  isSystem: boolean;
  restaurantId: string | null;
  permissions: {
    permission: {
      id: string;
      name: string;
      description?: string;
    };
  }[];
  _count?: {
    users: number;
  };
}

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  roleToEdit?: RoleItem | null;
  catalog: CatalogData | null;
}

export const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  roleToEdit,
  catalog,
}) => {
  const isEditMode = !!roleToEdit;

  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Initialize or reset form when modal opens or roleToEdit changes
  useEffect(() => {
    if (!isOpen) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrorMsg('');
    if (roleToEdit) {
      setName(roleToEdit.name);
      const permNames = (roleToEdit.permissions || [])
        .map((p) => p.permission?.name ?? '')
        .filter(Boolean);
      setSelectedPermissions(new Set(permNames));
    } else {
      setName('');
      setSelectedPermissions(new Set());
    }
  }, [isOpen, roleToEdit]);

  if (!isOpen) return null;

  // Clone from preset
  const handleApplyPreset = (presetRole: string) => {
    if (!catalog?.systemRoleDefaults) return;
    const defaultPerms = catalog.systemRoleDefaults[presetRole] || [];
    setSelectedPermissions(new Set(defaultPerms));
  };

  // Toggle single permission
  const handleTogglePermission = (permName: string) => {
    const next = new Set(selectedPermissions);
    if (next.has(permName)) {
      next.delete(permName);
    } else {
      next.add(permName);
    }
    setSelectedPermissions(next);
  };

  // Toggle all in a category
  const handleToggleCategory = (categoryPerms: PermissionDefinition[]) => {
    const permNames = categoryPerms.map((p) => p.name);
    const allSelected = permNames.every((p) => selectedPermissions.has(p));
    const next = new Set(selectedPermissions);

    if (allSelected) {
      permNames.forEach((p) => next.delete(p));
    } else {
      permNames.forEach((p) => next.add(p));
    }
    setSelectedPermissions(next);
  };

  // Toggle global all / none
  const handleSelectAll = () => {
    if (!catalog) return;
    const all = catalog.permissions.map((p) => p.name);
    setSelectedPermissions(new Set(all));
  };

  const handleClearAll = () => {
    setSelectedPermissions(new Set());
  };

  // Category icons helper
  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Utensils':
        return <Utensils className="h-4 w-4 text-brand-500" />;
      case 'LayoutGrid':
        return <LayoutGrid className="h-4 w-4 text-blue-500" />;
      case 'BookOpen':
        return <BookOpen className="h-4 w-4 text-emerald-500" />;
      case 'Users':
        return <Users className="h-4 w-4 text-amber-500" />;
      case 'BarChart3':
        return <BarChart3 className="h-4 w-4 text-violet-500" />;
      default:
        return <Shield className="h-4 w-4 text-zinc-500" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Role title is required.');
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && roleToEdit) {
        await apiFetch(`/roles/${roleToEdit.id}`, {
          method: 'PATCH',
          body: {
            name: name.trim(),
            permissionNames: Array.from(selectedPermissions),
          },
        });
      } else {
        await apiFetch('/roles', {
          method: 'POST',
          body: {
            name: name.trim(),
            permissionNames: Array.from(selectedPermissions),
          },
        });
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save role.');
    } finally {
      setLoading(false);
    }
  };

  const totalCatalogCount = catalog?.permissions.length || 0;
  const selectedCount = selectedPermissions.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-500 via-violet-500 to-amber-400" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-900">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {isEditMode ? `Edit Role: ${roleToEdit.name}` : 'Create Custom Role'}
              </h2>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
                Assign capabilities and terminal access permissions for this security level.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-100 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-5 mt-4 flex items-center justify-between rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-xs font-bold text-red-600 dark:text-red-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="cursor-pointer text-red-400 hover:text-red-700">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Top Inputs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Role Title */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Role Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bartender, Senior Captain, Host"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isEditMode && roleToEdit?.isSystem}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 px-3.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all focus:border-violet-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60"
                  required
                />
              </div>

              {/* Clone Preset Selector */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Preset Blueprint (Optional)
                </label>
                <div className="relative">
                  <Copy className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handleApplyPreset(e.target.value);
                    }}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-2.5 pr-3.5 pl-9 text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none transition-all focus:border-violet-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-violet-500/20 cursor-pointer"
                  >
                    <option value="" disabled>Clone permissions from...</option>
                    <option value="WAITER">Waiter (Floor & Order view/create)</option>
                    <option value="CASHIER">Cashier (Order manage, Tables, Reports)</option>
                    <option value="STORE_MANAGER">Store Manager (Operational authority)</option>
                    <option value="KITCHEN_CHEF">Kitchen Chef (KOTs & Menu view)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Matrix Header & Global Select Controls */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Granular Permissions Matrix
                </span>
                <span className="rounded-full bg-violet-100 dark:bg-violet-950/60 px-2 py-0.5 text-[10px] font-black text-violet-700 dark:text-violet-300">
                  {selectedCount} of {totalCatalogCount} Active
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Categorized Permissions Grid */}
            <div className="space-y-4">
              {catalog?.categories.map((cat) => {
                const catPerms = cat.permissions;
                const catSelectedCount = catPerms.filter((p) => selectedPermissions.has(p.name)).length;
                const isAllSelected = catSelectedCount === catPerms.length && catPerms.length > 0;

                return (
                  <div
                    key={cat.key}
                    className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 p-3.5"
                  >
                    {/* Category Title Bar */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {renderCategoryIcon(cat.icon)}
                        <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                          {cat.label}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                          ({catSelectedCount}/{catPerms.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(catPerms)}
                        className="text-[10px] font-black uppercase tracking-wider text-zinc-500 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer transition-colors"
                      >
                        {isAllSelected ? 'Deselect All' : 'Select Category'}
                      </button>
                    </div>

                    {/* Permissions Tiles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {catPerms.map((perm) => {
                        const isChecked = selectedPermissions.has(perm.name);
                        return (
                          <div
                            key={perm.name}
                            onClick={() => handleTogglePermission(perm.name)}
                            className={`flex items-start gap-2.5 rounded-lg border p-2.5 transition-all cursor-pointer select-none ${
                              isChecked
                                ? 'border-violet-300 dark:border-violet-700 bg-violet-50/60 dark:bg-violet-950/20 text-zinc-900 dark:text-zinc-100 shadow-xs'
                                : 'border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            <div
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                isChecked
                                  ? 'border-violet-600 bg-violet-600 text-white'
                                  : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                              }`}
                            >
                              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-bold leading-tight">
                                {perm.label}
                              </div>
                              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                                {perm.description}
                              </div>
                              <div className="mt-1 font-mono text-[9px] text-zinc-400 dark:text-zinc-500">
                                {perm.name}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-4">
            <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              <strong className="text-zinc-900 dark:text-zinc-100">{selectedCount}</strong> permissions configured
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 px-5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {loading ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>{isEditMode ? 'Update Role' : 'Create Role'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
