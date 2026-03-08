import React from 'react';
import { cn } from './utils';

export function Avatar({
    name,
    size = 'md',
    src,
    className,
}: {
    name: string;
    size?: 'sm' | 'md' | 'lg';
    src?: string;
    className?: string;
}) {
    const sizes: Record<string, string> = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-14 h-14 text-lg',
    };

    const colors = [
        'from-primary-500 to-indigo-600',
        'from-emerald-500 to-teal-600',
        'from-amber-500 to-orange-600',
        'from-rose-500 to-pink-600',
        'from-cyan-500 to-blue-600',
        'from-purple-500 to-violet-600',
    ];

    const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

    if (src) {
        return (
            <img
                src={src}
                alt={name}
                className={cn('rounded-xl object-cover', sizes[size], className)}
            />
        );
    }

    return (
        <div
            className={cn(
                'rounded-xl bg-gradient-to-br flex items-center justify-center font-semibold text-white',
                sizes[size],
                colors[colorIndex],
                className
            )}
        >
            {initials}
        </div>
    );
}
