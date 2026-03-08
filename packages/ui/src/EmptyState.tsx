import React from 'react';
import { cn } from './utils';

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: {
    icon: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
            <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center text-surface-400 mb-4">
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-surface-700 mb-1">{title}</h3>
            {description && <p className="text-sm text-surface-400 max-w-sm mb-6">{description}</p>}
            {action && <div>{action}</div>}
        </div>
    );
}
