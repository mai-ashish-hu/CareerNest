import { NavLink } from '@remix-run/react';
import { cn } from '@careernest/ui';
import type { ReactNode } from 'react';

interface SidebarLink { to: string; label: string; icon: ReactNode; }

export function Sidebar({ links, collegeName }: { links: SidebarLink[]; collegeName?: string }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-900 text-white flex flex-col z-40">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white', 'bg-gradient-to-br from-primary-600 to-indigo-500')}>CN</div>
          <div>
            <h1 className="font-bold text-lg">CareerNest</h1>
            <p className="text-xs text-surface-400 truncate max-w-[160px]">{collegeName || 'College Portal'}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}>
            {link.icon}<span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10"><p className="text-xs text-surface-500 text-center">&copy; 2026 CareerNest</p></div>
    </aside>
  );
}
