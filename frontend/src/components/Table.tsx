import React from 'react';
import { Loader } from './Loader';

interface TableProps<T> {
  headers: string[];
  data: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
}

export function Table<T>({
  headers,
  data,
  renderRow,
  emptyMessage = 'No data available.',
  loading = false,
}: TableProps<T>) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-colors duration-150">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 select-none"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={headers.length} className="py-12 text-center">
                  <Loader size="sm" text="Loading data..." />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="py-12 text-center">
                  <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                    {emptyMessage}
                  </span>
                </td>
              </tr>
            ) : (
              data.map((item, index) => renderRow(item, index))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
