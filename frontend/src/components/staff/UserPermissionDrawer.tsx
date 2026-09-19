'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, Minus, Plus, Loader2, Save } from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { type CatalogData } from './RoleModal';

interface PermissionOverride {
  permissionId: string;
  permissionName: string;
  description: string | null;
  granted: boolean;
}

interface UserPermissionsData {
  rolePermissions: { permissionId: string; permissionName: string; description: string | null }[];
  overrides: PermissionOverride[];
  effectivePermissions: string[];
}

interface StaffUser {
  id: string;
  name: string;
  role: { name: string };
}

interface Props {
  user: StaffUser | null;
  catalog: CatalogData | null;
  onClose: () => void;
}

type OverrideState = 'inherited' | 'granted' | 'revoked';

export const UserPermissionDrawer: React.FC<Props> = ({ user, catalog, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<UserPermissionsData | null>(null);
  const [overrideMap, setOverrideMap] = useState<Map<string, OverrideState>>(new Map());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<UserPermissionsData>(`/roles/users/${user.id}/permissions`);
      setData(res);
      const map = new Map<string, OverrideState>();
      for (const o of res.overrides) {
        map.set(o.permissionName, o.granted ? 'granted' : 'revoked');
      }
      setOverrideMap(map);
    } catch (err: any) {
      setError(err.message || 'Failed to load permissions.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  const rolePermissionNames = new Set(data?.rolePermissions.map((p) => p.permissionName) ?? []);

  const toggle = (permName: string) => {
    setOverrideMap((prev) => {
      const next = new Map(prev);
      const current = next.get(permName) ?? 'inherited';
      if (rolePermissionNames.has(permName)) {
        // Permission is from role: can be inherited or revoked
        next.set(permName, current === 'revoked' ? 'inherited' : 'revoked');
      } else {
        // Permission is not from role: can be inherited(=not granted) or granted
        next.set(permName, current === 'granted' ? 'inherited' : 'granted');
      }
      return next;
    });
    setSuccess('');
  };

  const save = async () => {
    if (!user || !data) return;
    setSaving(true);
    setError('');
    try {
      const overrides: { permissionId: string; granted: boolean }[] = [];
      for (const [permName, state] of overrideMap.entries()) {
        if (state === 'inherited') continue;
        const permId =
          data.rolePermissions.find((p) => p.permissionName === permName)?.permissionId ??
          data.overrides.find((o) => o.permissionName === permName)?.permissionId;
        if (permId) {
          overrides.push({ permissionId: permId, granted: state === 'granted' });
        }
      }

      await apiFetch(`/roles/users/${user.id}/permissions`, {
        method: 'PUT',
        body: { overrides },
      });

      setSuccess('Permissions saved.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const allPermissions = catalog?.permissions ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white dark:bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Permission Overrides
            </p>
            <h2 className="mt-0.5 font-extrabold text-zinc-900 dark:text-zinc-100">{user.name}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Role:{' '}
              <span className="font-bold text-violet-600 dark:text-violet-400">
                {user.role.name.replace(/_/g, ' ')}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-12 gap-2 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          )}

          {!loading && error && (
            <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {!loading && data && (
            <>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pb-1">
                Toggle permissions to grant or revoke on top of the assigned role. Changes take effect immediately on the next API call.
              </p>

              {catalog?.categories.map((cat) => (
                <div key={cat.key} className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                      {cat.label}
                    </span>
                  </div>
                  {cat.permissions.map((perm) => {
                    const state = overrideMap.get(perm.name) ?? 'inherited';
                    const fromRole = rolePermissionNames.has(perm.name);
                    const isEffective =
                      (fromRole && state !== 'revoked') || (!fromRole && state === 'granted');
                    const btnColorClass =
                      state === 'revoked'
                        ? 'bg-red-100 dark:bg-red-950/40 text-red-600 hover:bg-red-200'
                        : isEffective
                        ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-200'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-200';

                    return (
                      <div
                        key={perm.name}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 border-t border-zinc-100 dark:border-zinc-800/60 first:border-t-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                              {perm.label}
                            </span>
                            {fromRole && state !== 'revoked' && (
                              <span className="shrink-0 rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-[9px] font-semibold text-zinc-500 dark:text-zinc-400">
                                role
                              </span>
                            )}
                            {state === 'granted' && (
                              <span className="shrink-0 rounded bg-emerald-50 dark:bg-emerald-950/30 px-1 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                +granted
                              </span>
                            )}
                            {state === 'revoked' && (
                              <span className="shrink-0 rounded bg-red-50 dark:bg-red-950/30 px-1 py-0.5 text-[9px] font-bold text-red-600 dark:text-red-400">
                                −revoked
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                            {perm.description}
                          </p>
                        </div>

                        <button
                          onClick={() => toggle(perm.name)}
                          className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full transition-colors cursor-pointer ${btnColorClass}`}
                          title={
                            fromRole
                              ? state === 'revoked'
                                ? 'Click to restore (inherited from role)'
                                : 'Click to revoke'
                              : state === 'granted'
                              ? 'Click to remove grant'
                              : 'Click to grant'
                          }
                        >
                          {state === 'revoked' ? (
                            <Minus className="h-3.5 w-3.5" />
                          ) : isEffective ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 px-5 py-3 flex items-center justify-between gap-3">
          {success && (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{success}</p>
          )}
          {!success && <span />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              Close
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-60 cursor-pointer transition-colors"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Overrides
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
