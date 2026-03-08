import React from 'react';
import { cn } from './utils';

interface Column<T> { header: string; accessor: keyof T | ((row: T) => React.ReactNode); className?: string; }

export function Table<T>({ columns, data, onRowClick, emptyMessage = 'No data found', keyExtractor }: {
    columns: Column<T>[]; data: T[]; onRowClick?: (row: T) => void; emptyMessage?: string; keyExtractor: (row: T) => string;
}) {
    return (
        <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-surface-100">
                            {columns.map((col, i) => (
                                <th key={i} className={cn('px-6 py-4 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider', col.className)}>{col.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-50">
                        {data.length === 0 ? (
                            <tr><td colSpan={columns.length} className="px-6 py-12 text-center text-surface-400">{emptyMessage}</td></tr>
                        ) : data.map((row) => (
                            <tr key={keyExtractor(row)} onClick={() => onRowClick?.(row)} className={cn('transition-colors duration-150', onRowClick && 'cursor-pointer hover:bg-primary-50/50')}>
                                {columns.map((col, i) => (
                                    <td key={i} className={cn('px-6 py-4 text-sm text-surface-700', col.className)}>
                                        {typeof col.accessor === 'function' ? col.accessor(row) : (row[col.accessor] as React.ReactNode)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
