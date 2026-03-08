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
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isSectionActive = (section: SidebarSection) => {
    return section.links.some(
      (link) => location.pathname === link.to || location.pathname.startsWith(link.to + '/')
    );
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-900 text-white flex flex-col z-40">
      {/* Branding */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white bg-gradient-to-br from-rose-600 to-orange-500 shadow-lg">
            CN
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">CareerNest</h1>
            <p className="text-[11px] text-surface-400 font-medium tracking-wide uppercase">
              Control Center
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 scrollbar-thin">
        {sections.map((section) => {
          const isActive = isSectionActive(section);
          const isCollapsed = collapsed[section.title] ?? false;

          return (
            <div key={section.title}>
              <button
                onClick={() => toggleSection(section.title)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider rounded-lg transition-colors',
                  isActive
                    ? 'text-primary-400'
                    : 'text-surface-500 hover:text-surface-300'
                )}
              >
                <span>{section.title}</span>
                <ChevronDown
                  size={14}
                  className={cn(
                    'transition-transform duration-200',
                    isCollapsed && '-rotate-90'
                  )}
                />
              </button>

              {!isCollapsed && (
                <div className="mt-0.5 space-y-0.5">
                  {section.links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/dashboard'}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition-all duration-200',
                          isActive
                            ? 'text-white bg-primary-600/80 shadow-glow font-medium'
                            : 'text-surface-400 hover:text-white hover:bg-white/10'
                        )
                      }
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
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-xs text-surface-500">System Online</p>
        </div>
        <p className="text-[10px] text-surface-600 text-center mt-2">
          &copy; 2026 CareerNest v1.0
        </p>
      </div>
    </aside>
  );
}
