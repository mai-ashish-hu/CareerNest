import { Form } from '@remix-run/react';
import { LogOut, Menu } from 'lucide-react';

export function Header({ userName, userRole, onMenuToggle }: { userName: string; userRole: string; onMenuToggle?: () => void }) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-surface-100">
      <div className="flex items-center justify-between px-4 sm:px-8 py-4">
        <div className="flex items-center gap-4">
          <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-xl text-surface-500 hover:bg-surface-100 transition-colors">
            <Menu size={20} />
          </button>
          <span className="text-sm font-medium text-surface-500 hidden sm:inline">Company Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 pl-3 border-l border-surface-200">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm">{userName.charAt(0).toUpperCase()}</div>
            <div className="hidden sm:block"><p className="text-sm font-medium text-surface-800">{userName}</p><p className="text-xs text-surface-400 capitalize">{userRole.replace(/_/g, ' ')}</p></div>
          </div>
          <Form method="post" action="/logout"><button type="submit" className="p-2 rounded-xl text-surface-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Logout"><LogOut size={20} /></button></Form>
        </div>
      </div>
    </header>
  );
}
