import React from 'react';
import { cn } from './utils';

export function Card({ children, className, hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) {
    return (
        <div className={cn('glass-card p-6 animate-fade-in', hover && 'hover:shadow-glass-lg hover:-translate-y-0.5 transition-all duration-300', className)}>
            {children}
        </div>
    );
}

export function StatCard({ title, value, subtitle, icon, trend, className }: {
    title: string; value: string | number; subtitle?: string; icon?: React.ReactNode;
    trend?: { value: number; isPositive: boolean }; className?: string;
}) {
    return (
        <Card className={cn('stat-card', className)}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-surface-500">{title}</p>
                    <p className="text-3xl font-bold mt-1 text-surface-900">{value}</p>
                    {subtitle && <p className="text-sm text-surface-400 mt-1">{subtitle}</p>}
                    {trend && (
                        <p className={cn('text-sm font-medium mt-2', trend.isPositive ? 'text-emerald-600' : 'text-rose-600')}>
                            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                        </p>
                    )}
                </div>
                {icon && <div className="p-3 rounded-xl bg-primary-50 text-primary-600">{icon}</div>}
            </div>
        </Card>
    );
}
