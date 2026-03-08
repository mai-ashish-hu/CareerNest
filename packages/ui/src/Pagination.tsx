import React from 'react';
import { cn } from './utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    className,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}) {
    if (totalPages <= 1) return null;

    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (currentPage > 3) pages.push('...');
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
    }

    return (
        <div className={cn('flex items-center justify-between', className)}>
            <p className="text-sm text-surface-500">
                Page <span className="font-medium text-surface-700">{currentPage}</span> of{' '}
                <span className="font-medium text-surface-700">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                {pages.map((page, idx) =>
                    page === '...' ? (
                        <span key={`dots-${idx}`} className="px-2 text-surface-400">…</span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={cn(
                                'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
                                page === currentPage
                                    ? 'bg-primary-600 text-white shadow-md'
                                    : 'text-surface-600 hover:bg-surface-100'
                            )}
                        >
                            {page}
                        </button>
                    )
                )}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
