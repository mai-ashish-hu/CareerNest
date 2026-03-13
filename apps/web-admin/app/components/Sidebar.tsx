import { NavLink, useLocation } from '@remix-run/react';
import { cn } from '@careernest/ui';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface SidebarLink {
    to: string;
    label: string;
    icon: ReactNode;
}

interface SidebarSection {
    title: string;
    links: SidebarLink[];
}

export function Sidebar({ sections }: { sections: SidebarSection[] }) {
    const location = useLocation();
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const toggleSection = (title: string) => {
        setCollapsed((current) => ({ ...current, [title]: !current[title] }));
    };

    const isSectionActive = (section: SidebarSection) => (
        section.links.some((link) => location.pathname === link.to || location.pathname.startsWith(link.to + '/'))
    );

    return (
        <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
                        CN
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-slate-900">CareerNest</h1>
                        <p className="text-xs text-slate-500">Admin Panel</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
                <div className="space-y-4">
                    {sections.map((section) => {
                        const isActive = isSectionActive(section);
                        const isCollapsed = collapsed[section.title] ?? false;

                        return (
                            <div key={section.title}>
                                <button
                                    onClick={() => toggleSection(section.title)}
                                    className={cn(
                                        'flex w-full items-center justify-between px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide transition-colors',
                                        isActive ? 'text-primary-700' : 'text-slate-500 hover:text-slate-700'
                                    )}
                                >
                                    <span>{section.title}</span>
                                    <ChevronDown
                                        size={14}
                                        className={cn('transition-transform duration-200', isCollapsed && '-rotate-90')}
                                    />
                                </button>

                                {!isCollapsed && (
                                    <div className="mt-1 space-y-1">
                                        {section.links.map((link) => (
                                            <NavLink
                                                key={link.to}
                                                to={link.to}
                                                end={link.to === '/dashboard'}
                                                className={({ isActive }) => (
                                                    isActive ? 'sidebar-link-active' : 'sidebar-link'
                                                )}
                                            >
                                                {link.icon}
                                                <span>{link.label}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </nav>

            <div className="border-t border-slate-200 px-5 py-4">
                <p className="text-xs text-slate-500">CareerNest v1.0</p>
            </div>
        </aside>
    );
}
