import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export function Pagination({
  currentPage = 1,
  totalCount = 0,
  pageSize = 20,
  onPageChange,
  hasNext,
  hasPrevious,
  itemName = 'سجل',
}) {
  const calculatedTotalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Determine total pages: if hasNext and hasPrevious are both false, total is 1, otherwise use calculated
  const totalPages =
    typeof hasNext === 'boolean' && typeof hasPrevious === 'boolean' && !hasNext && !hasPrevious
      ? 1
      : calculatedTotalPages;

  // Determine if previous/next are allowed
  const canGoPrev = typeof hasPrevious === 'boolean' ? hasPrevious : currentPage > 1;
  const canGoNext = typeof hasNext === 'boolean' ? hasNext : currentPage < totalPages;

  // Calculate visible page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);

      if (currentPage <= 3) {
        start = 1;
        end = maxVisible;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - maxVisible + 1;
        end = totalPages;
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm dir-rtl w-full select-none"
      dir="rtl"
    >
      {/* Items Summary */}
      <div>
        <p className="text-xs text-slate-600 font-medium">
          إظهار <span className="font-black text-slate-900">{startRecord}</span> إلى{' '}
          <span className="font-black text-slate-900">{endRecord}</span> من أصل{' '}
          <span className="font-black text-teal-800">{totalCount}</span> {itemName}
        </p>
      </div>

      {/* Pagination Navigation */}
      <nav className="flex items-center gap-1.5" aria-label="Pagination Navigation">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => canGoPrev && onPageChange && onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-teal-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-all shadow-2xs"
          title="الصفحة السابقة"
        >
          <ChevronRight className="w-4 h-4 text-slate-500" />
          <span>السابق</span>
        </button>

        {/* Page Number Buttons (Desktop & Tablet) */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((page, idx) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 text-xs font-bold text-slate-400 select-none"
                >
                  ...
                </span>
              );
            }

            const isCurrent = page === currentPage;
            const isPageDisabled = !isCurrent && page > currentPage && hasNext === false;

            return (
              <button
                key={`page-${page}`}
                type="button"
                onClick={() => !isPageDisabled && onPageChange && onPageChange(page)}
                disabled={isPageDisabled}
                className={`min-w-[34px] h-8 text-xs font-black rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-teal-700 text-white shadow-xs border border-teal-800'
                    : isPageDisabled
                    ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Current Page Badge (Mobile Only) */}
        <span className="sm:hidden px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-teal-800">
          صفحة {currentPage} من {totalPages}
        </span>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => canGoNext && onPageChange && onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-teal-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-all shadow-2xs"
          title="الصفحة التالية"
        >
          <span>التالي</span>
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
      </nav>
    </div>
  );
}

export default Pagination;
