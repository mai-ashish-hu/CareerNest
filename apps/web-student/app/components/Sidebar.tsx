import { NavLink } from '@remix-run/react';
import { cn } from '@careernest/ui';
import { Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface SidebarLink {
    to: string;
    label: string;
    icon: ReactNode;
}

export function Sidebar({
    links,
    isOpen,
    onClose,
    student,
}: {
    links: SidebarLink[];
    isOpen: boolean;
    onClose: () => void;
    student: {
        name: string;
        role: string;
        profilePicture?: string;
        currentYear?: string;
        headline?: string;
        completionScore?: number;
    };
}) {
    const [hasImageError, setHasImageError] = useState(false);

    useEffect(() => {
        setHasImageError(false);
    }, [student.profilePicture]);

    return (
        <>
            {isOpen ? (
                <div
                    className="fixed inset-0 z-40 bg-surface-950/60 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            ) : null}

            <aside
                className={cn(
                    'fixed left-0 top-0 z-50 flex h-screen w-72 flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,_#081a1a_0%,_#0d2530_55%,_#0f172a_100%)] text-white transition-transform duration-300 ease-in-out',
                    'lg:translate-x-0 lg:z-40',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.25),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.18),_transparent_30%)]" />

                <div className="relative border-b border-white/10 p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 font-bold text-surface-950 shadow-lg shadow-emerald-500/20">
                                CN
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-white">
                                    CareerNest
                                </h1>
                                <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                                    Student Web
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="rounded-xl p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white lg:hidden"
                            aria-label="Close menu"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="mt-5 rounded-[1.8rem] border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl">
                        <div className="flex items-start gap-3">
                            {student.profilePicture && !hasImageError ? (
                                <img
                                    src={student.profilePicture}
                                    alt={student.name}
                                    crossOrigin="anonymous"
                                    onError={() => setHasImageError(true)}
                                    className="h-14 w-14 rounded-2xl object-cover"
                                />
                            ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold text-white">
                                    {student.name
                                        .split(' ')
                                        .filter(Boolean)
                                        .slice(0, 2)
                                        .map((part) => part[0]?.toUpperCase() || '')
                                        .join('')}
                                </div>
                            )}

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-semibold text-white">
                                    {student.name}
                                </p>
                                <p className="mt-1 truncate text-sm text-white/60">
                                    {student.headline || 'Build your profile and stay placement-ready.'}
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                                    <span>{student.currentYear || 'Student'}</span>
                                    <span className="text-white/25">/</span>
                                    <span>{student.role.replace(/_/g, ' ')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                                <span>Profile ready</span>
                                <span>{student.completionScore || 0}%</span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-white/10">
                                <div
                                    className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400"
                                    style={{ width: `${student.completionScore || 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <nav className="relative flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            onClick={onClose}
                            className={({ isActive }) =>
                                isActive ? 'sidebar-link-active' : 'sidebar-link'
                            }
                        >
                            {link.icon}
                            <span>{link.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="relative border-t border-white/10 p-4">
                    <div className="rounded-[1.6rem] border border-emerald-300/15 bg-gradient-to-br from-emerald-500/15 to-sky-500/10 p-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-emerald-200">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    Keep your student profile fresh
                                </p>
                                <p className="mt-1 text-sm leading-6 text-white/65">
                                    Better profiles make networking, chat, and drive applications easier.
                                </p>
                            </div>
                        </div>

                        <NavLink
                            to="/profile"
                            onClick={onClose}
                            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-surface-950 transition hover:bg-emerald-50"
                        >
                            Polish profile
                        </NavLink>
                    </div>
                </div>
            </aside>
        </>
    );
}
