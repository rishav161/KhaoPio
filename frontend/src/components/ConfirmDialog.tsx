'use client';

import React, { useState } from 'react';
import { useConfirmStore } from '@/store/useConfirmStore';
import { AlertCircle, HelpCircle, Info, CheckCircle2, X } from 'lucide-react';

export function ConfirmDialog() {
  const { isOpen, options, close } = useConfirmStore();
  const [loading, setLoading] = useState(false);

  if (!isOpen || !options) return null;

  const handleConfirm = async () => {
    if (options.onConfirm) {
      setLoading(true);
      try {
        await options.onConfirm();
      } catch (err) {
        console.error('Error during dialog confirmation:', err);
      } finally {
        setLoading(false);
      }
    }
    close();
  };

  const handleCancel = () => {
    if (options.onCancel) {
      options.onCancel();
    }
    close();
  };

  // Color schemes based on dialog type
  let iconColor = 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20';
  let confirmBtnColor = 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100';
  let Icon = HelpCircle;

  if (options.type === 'danger') {
    iconColor = 'text-red-500 bg-red-50 dark:bg-red-950/20';
    confirmBtnColor = 'bg-red-500 hover:bg-red-600 shadow-red-100';
    Icon = AlertCircle;
  } else if (options.type === 'warning') {
    iconColor = 'text-amber-500 bg-amber-50 dark:bg-amber-950/20';
    confirmBtnColor = 'bg-amber-500 hover:bg-amber-600 shadow-amber-100';
    Icon = AlertCircle;
  } else if (options.type === 'success') {
    iconColor = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20';
    confirmBtnColor = 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100';
    Icon = CheckCircle2;
  } else if (options.type === 'info') {
    iconColor = 'text-blue-500 bg-blue-50 dark:bg-blue-950/20';
    confirmBtnColor = 'bg-blue-500 hover:bg-blue-600 shadow-blue-100';
    Icon = Info;
  }

  const isAlertOnly = !options.cancelText && !options.onCancel;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      {/* Backdrop click to cancel (if not loading) */}
      <div 
        onClick={!loading ? handleCancel : undefined} 
        className="fixed inset-0 -z-10" 
      />

      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xl transition-all scale-100 duration-200">
        <div className="flex items-start gap-3.5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconColor}`}>
            <Icon className="h-5.5 w-5.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50">
              {options.title}
            </h3>
            <p className="mt-1.5 text-xs text-zinc-550 dark:text-zinc-400 font-semibold leading-relaxed">
              {options.message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-850">
          {!isAlertOnly && (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="rounded-lg border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50 transition-all"
            >
              {options.cancelText || 'Cancel'}
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`rounded-lg text-white px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm dark:shadow-none ${confirmBtnColor}`}
          >
            {loading ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              options.confirmText || 'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
