import React from 'react';
import { cn } from './utils';

export function Input({ label, error, icon, className, id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; icon?: React.ReactNode }) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
        <div className="w-full">
            {label && <label htmlFor={inputId} className="form-label">{label}</label>}
            <div className="relative">
                {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">{icon}</div>}
                <input id={inputId} className={cn('form-input', icon && 'pl-10', error && 'border-rose-400 focus:ring-rose-500', className)} {...props} />
            </div>
            {error && <p className="mt-1.5 text-sm text-rose-600">{error}</p>}
        </div>
    );
}

export function Select({ label, error, options, className, id, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; options: { value: string; label: string }[] }) {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
        <div className="w-full">
            {label && <label htmlFor={selectId} className="form-label">{label}</label>}
            <select id={selectId} className={cn('form-input appearance-none', error && 'border-rose-400 focus:ring-rose-500', className)} {...props}>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {error && <p className="mt-1.5 text-sm text-rose-600">{error}</p>}
        </div>
    );
}

export function Textarea({ label, error, className, id, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }) {
    const tid = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
        <div className="w-full">
            {label && <label htmlFor={tid} className="form-label">{label}</label>}
            <textarea id={tid} className={cn('form-input min-h-[100px] resize-y', error && 'border-rose-400 focus:ring-rose-500', className)} {...props} />
            {error && <p className="mt-1.5 text-sm text-rose-600">{error}</p>}
        </div>
    );
}
