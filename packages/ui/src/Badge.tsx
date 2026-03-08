import { cn } from './utils';

export function Badge({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) {
    return (
        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', variant || 'bg-surface-100 text-surface-700', className)}>
            {children}
        </span>
    );
}
