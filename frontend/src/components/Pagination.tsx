import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = [];
  // Build page numbers
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3.5 sm:px-6 rounded-xl shadow-sm mt-4 transition-colors duration-150">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer select-none"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer select-none"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">
            Showing page <span className="font-black text-zinc-900 dark:text-zinc-50">{currentPage}</span> of{' '}
            <span className="font-black text-zinc-900 dark:text-zinc-50">{totalPages}</span> pages
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-lg shadow-sm" aria-label="Pagination">
            {/* Prev Button */}
            <button
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 py-2 text-zinc-450 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-30 cursor-pointer"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Numeric Page List */}
            {pages.map((p) => {
              const isCurrent = p === currentPage;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`relative inline-flex items-center border px-3 py-1.5 text-xs font-black cursor-pointer transition-all ${
                    isCurrent
                      ? 'z-10 bg-coral-500 border-coral-500 text-white shadow-sm'
                      : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-650 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            {/* Next Button */}
            <button
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 py-2 text-zinc-450 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-30 cursor-pointer"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
