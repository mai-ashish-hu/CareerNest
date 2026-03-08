import React, { useEffect, useRef } from 'react';
import { cn } from './utils';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, size = 'md' }: {
    isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
    const overlayRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) { document.addEventListener('keydown', handleEsc); document.body.style.overflow = 'hidden'; }
        return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = ''; };
    }, [isOpen, onClose]);
    if (!isOpen) return null;
    const sizes: Record<string, string> = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
    return (
        <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={(e) => e.target === overlayRef.current && onClose()}>
            <div className={cn('w-full bg-white rounded-2xl shadow-glass-lg animate-slide-up max-h-[90vh] flex flex-col', sizes[size])}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-surface-900">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="px-6 py-4 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}
