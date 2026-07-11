'use client';

import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { Table } from '@/components/Table';

interface StaffUser {
  id: string;
  name: string;
  email: string | null;
  status: string;
  role: {
    name: string;
  };
  createdAt: string;
}

export default function StaffActivityReport() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStaff = async () => {
    setLoading(true);
    setError('');
    try {
      // Re-use existing administrative staff fetching helper
      const data = await apiFetch<StaffUser[]>('/auth/users');
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to sync staff records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-250">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <Users className="h-6 w-6 text-coral-500" />
            <span>Staff Activity Log</span>
          </h1>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Monitor registered restaurant user accounts, active roles, and creation timestamps.
          </p>
        </div>
        
        <button
          onClick={fetchStaff}
          className="flex items-center gap-1.5 self-start rounded-lg border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 text-xs font-bold text-red-650 dark:text-red-400">
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1">
        <Table
          headers={['Staff Member', 'Email Address', 'System Role', 'Status', 'Registered On']}
          data={users}
          loading={loading}
          emptyMessage="No staff members registered in the restaurant database."
          renderRow={(user) => (
            <tr key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors">
              <td className="px-5 py-3 font-bold text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-coral-50 dark:bg-coral-950/20 text-coral-500 flex items-center justify-center font-black text-[10px]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span>{user.name}</span>
              </td>
              <td className="px-5 py-3 text-zinc-400 font-mono">{user.email || 'N/A'}</td>
              <td className="px-5 py-3 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="font-bold text-[10px] tracking-wider uppercase">{user.role.name}</span>
              </td>
              <td className="px-5 py-3">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-black tracking-wider uppercase ${
                  user.status === 'ACTIVE' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-450'
                }`}>
                  {user.status}
                </span>
              </td>
              <td className="px-5 py-3 text-zinc-400 font-mono">
                {new Date(user.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </td>
            </tr>
          )}
        />
      </div>
    </div>
  );
}
