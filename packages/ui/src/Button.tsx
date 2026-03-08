import React from 'react';
import { cn } from './utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export function Button({ children, variant = 'primary', size = 'md', isLoading = false, className, disabled, ...props }: ButtonProps) {
    const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants: Record<string, string> = {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-md hover:shadow-lg',
        secondary: 'bg-surface-100 text-surface-700 hover:bg-surface-200 focus:ring-surface-400',
        danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500',
        ghost: 'text-surface-600 hover:bg-surface-100 focus:ring-surface-400',
        outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
    };
    const sizes: Record<string, string> = { sm: 'px-3 py-1.5 text-sm gap-1.5', md: 'px-5 py-2.5 text-sm gap-2', lg: 'px-6 py-3 text-base gap-2' };

    return (
        <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || isLoading} {...props}>
            {isLoading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {children}
        </button>
    );
}
