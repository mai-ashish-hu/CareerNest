import type { ReactNode } from 'react';
import { cn } from '@careernest/ui';

type HeroTone = 'emerald' | 'sky' | 'amber' | 'ink';

const heroToneClasses: Record<HeroTone, string> = {
    emerald: 'from-[#052e2b] via-[#0f4c44] to-[#115e59]',
    sky: 'from-[#082f49] via-[#0f4c81] to-[#0369a1]',
    amber: 'from-[#3f2308] via-[#8a4b10] to-[#c9771a]',
    ink: 'from-[#0f172a] via-[#1f2937] to-[#134e4a]',
};

const metricToneClasses: Record<HeroTone, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    sky: 'bg-sky-50 text-sky-700 ring-sky-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    ink: 'bg-surface-100 text-surface-700 ring-surface-200',
};

export function StudentPageHero({
    badge,
    title,
    description,
    actions,
    aside,
    children,
    tone = 'emerald',
    className,
}: {
    badge?: ReactNode;
    title: string;
    description: string;
    actions?: ReactNode;
    aside?: ReactNode;
    children?: ReactNode;
    tone?: HeroTone;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'relative overflow-hidden rounded-[2rem] border border-white/70 shadow-glass',
                className
            )}
        >
            <div
                className={cn(
                    'absolute inset-0 bg-gradient-to-br',
                    heroToneClasses[tone]
                )}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_36%)]" />
            <div className="absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -right-16 top-0 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />

            <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-8">
                <div>
                    {badge ? (
                        <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-md">
                            {badge}
                        </div>
                    ) : null}

                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        {title}
                    </h1>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70 sm:text-base">
                        {description}
                    </p>

                    {actions ? (
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            {actions}
                        </div>
                    ) : null}

                    {children ? <div className="mt-6">{children}</div> : null}
                </div>

                {aside ? (
                    <div className="rounded-[1.75rem] border border-white/20 bg-white/10 p-5 text-white shadow-2xl shadow-surface-950/10 backdrop-blur-xl">
                        {aside}
                    </div>
                ) : null}
            </div>
        </section>
    );
}

export function StudentMetricGrid({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>
            {children}
        </div>
    );
}

export function StudentMetricCard({
    label,
    value,
    hint,
    icon,
    tone = 'emerald',
    className,
}: {
    label: string;
    value: string | number;
    hint: string;
    icon?: ReactNode;
    tone?: HeroTone;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'student-surface-card flex items-start justify-between gap-4 px-5 py-5',
                className
            )}
        >
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">
                    {label}
                </p>
                <p className="mt-3 break-words text-2xl font-bold leading-tight text-surface-900">
                    {value}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-surface-500">{hint}</p>
            </div>

            {icon ? (
                <div
                    className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1',
                        metricToneClasses[tone]
                    )}
                >
                    {icon}
                </div>
            ) : null}
        </div>
    );
}
