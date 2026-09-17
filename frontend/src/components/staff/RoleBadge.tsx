import React from 'react';
import { Shield, Sparkles, ChefHat, UserCheck, KeyRound, Award } from 'lucide-react';

interface RoleBadgeProps {
  roleName: string;
  isSystem?: boolean;
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ roleName, isSystem = false, className = '' }) => {
  const normalized = (roleName || '').toUpperCase();

  let style = 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800';
  let Icon = Sparkles;

  switch (normalized) {
    case 'SUPER_ADMIN':
      style = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900';
      Icon = KeyRound;
      break;
    case 'STORE_MANAGER':
      style = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900';
      Icon = Award;
      break;
    case 'CASHIER':
      style = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900';
      Icon = Shield;
      break;
    case 'WAITER':
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900';
      Icon = UserCheck;
      break;
    case 'KITCHEN_CHEF':
      style = 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900';
      Icon = ChefHat;
      break;
    default:
      // Custom restaurant role
      style = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
      Icon = Sparkles;
      break;
  }

  // Format display name
  const displayName = roleName
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${style} ${className}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{displayName}</span>
    </span>
  );
};
