import React from 'react';
import { cn } from './utils';

export function Tabs({
    tabs,
    activeTab,
    onChange,
    className,
}: {
    tabs: { id: string; label: string; count?: number }[];
    activeTab: string;
    onChange: (id: string) => void;
    className?: string;
}) {
    return (
        <div className={cn('flex items-center gap-1 p-1 bg-surface-100 rounded-xl', className)}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                        activeTab === tab.id
                            ? 'bg-white text-surface-900 shadow-sm'
                            : 'text-surface-500 hover:text-surface-700'
                    )}
                >
                    {tab.label}
                    {tab.count !== undefined && (
                        <span
                            className={cn(
                                'px-1.5 py-0.5 rounded-full text-xs font-semibold',
                                activeTab === tab.id
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'bg-surface-200 text-surface-500'
                            )}
                        >
                            {tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
