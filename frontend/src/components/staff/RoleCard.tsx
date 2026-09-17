'use client';

import React, { useState } from 'react';
import {
  Users, Edit2, Trash2, Lock, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { RoleBadge } from './RoleBadge';
import { type RoleItem } from './RoleModal';

interface RoleCardProps {
  role: RoleItem;
  isSuperAdmin: boolean;
  onEdit: (role: RoleItem) => void;
  onDelete: (role: RoleItem) => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  role,
  isSuperAdmin,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Safely extract permission definitions (handles both { permission: {...} } and direct permission objects)
  const permissionsList = (role.permissions || [])
    .map((p) => p.permission)
    .filter((perm): perm is NonNullable<typeof perm> => !!(perm?.name || perm?.id));

  const userCount = role._count?.users || 0;
  const isSystem = role.isSystem;

  const displayLimit = 4;
  const visiblePermissions = isExpanded ? permissionsList : permissionsList.slice(0, displayLimit);
  const remainingCount = Math.max(0, permissionsList.length - displayLimit);

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700">
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                {(role.name || '').replace(/_/g, ' ')}
              </h3>
              {isSystem ? (
                <span className="inline-flex items-center gap-1 rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  <Lock className="h-2.5 w-2.5" />
                  System
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-violet-50 dark:bg-violet-950/50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-900">
                  <Sparkles className="h-2.5 w-2.5" />
                  Custom
                </span>
              )}
            </div>
            <div className="mt-1">
              <RoleBadge roleName={role.name} isSystem={isSystem} />
            </div>
          </div>

          {/* Assigned Staff Counter */}
          <div className="flex items-center gap-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-800 px-2.5 py-1 text-xs font-bold text-zinc-600 dark:text-zinc-300">
            <Users className="h-3.5 w-3.5 text-zinc-400" />
            <span>{userCount} {userCount === 1 ? 'member' : 'members'}</span>
          </div>
        </div>

        {/* Permissions Count & Chips */}
        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Granted Capabilities ({permissionsList.length})
            </span>
          </div>

          {permissionsList.length === 0 ? (
            <p className="text-[11px] italic text-zinc-400 dark:text-zinc-500 py-1">
              No specific terminal permissions configured for this role.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {visiblePermissions.map((perm, idx) => {
                const permName = perm?.name || '';
                const permDesc = perm?.description || permName;
                const permKey = perm?.id || permName || `perm-${idx}`;

                return (
                  <span
                    key={permKey}
                    className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-700 dark:text-zinc-300"
                    title={permDesc}
                  >
                    {permName}
                  </span>
                );
              })}

              {!isExpanded && remainingCount > 0 && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="flex items-center gap-1 rounded-md border border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300 hover:bg-violet-100 cursor-pointer transition-colors"
                >
                  <span>+{remainingCount} more</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              )}

              {isExpanded && remainingCount > 0 && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 cursor-pointer transition-colors"
                >
                  <span>Show less</span>
                  <ChevronUp className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="mt-5 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-3">
        {isSystem ? (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
            <Lock className="h-3.5 w-3.5" />
            <span>Immutable core blueprint</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <>
                <button
                  onClick={() => onEdit(role)}
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                  <span>Edit Role</span>
                </button>
                <button
                  onClick={() => onDelete(role)}
                  className="flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 px-3 py-1.5 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
