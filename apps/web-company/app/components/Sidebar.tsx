import { NavLink } from '@remix-run/react';
import { cn } from '@careernest/ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface SidebarLink { to: string; label: string; icon: ReactNode; }

export function Sidebar({ links, isOpen, onClose }: { links: SidebarLink[]; isOpen?: boolean; onClose?: () => void }) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={cn(
        'fixed left-0 top-0 h-screen w-64 bg-surface-900 text-white flex flex-col z-50 transition-transform duration-200',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white', 'bg-gradient-to-br from-amber-500 to-orange-500')}>CN</div>
            <div><h1 className="font-bold text-lg">CareerNest</h1><p className="text-xs text-surface-400">Company Portal</p></div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={onClose} className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}>
              {link.icon}<span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10"><p className="text-xs text-surface-500 text-center">&copy; 2026 CareerNest</p></div>
      </aside>
    </>
  );
}
