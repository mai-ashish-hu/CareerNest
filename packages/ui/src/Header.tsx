import { Form } from '@remix-run/react';
import { Bell, LogOut, Search } from 'lucide-react';

export function Header({ userName, userRole }: { userName: string; userRole: string }) {
    return (
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-surface-100">
            <div className="flex items-center justify-between px-8 py-4">
                <div className="relative w-96">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all" />
                </div>
                <div className="flex items-center gap-4">
                    <button className="relative p-2 rounded-xl text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors">
                        <Bell size={20} /><span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
                    </button>
                    <div className="flex items-center gap-3 pl-4 border-l border-surface-200">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm">{userName.charAt(0).toUpperCase()}</div>
                        <div>
                            <p className="text-sm font-medium text-surface-800">{userName}</p>
                            <p className="text-xs text-surface-400 capitalize">{userRole.replace(/_/g, ' ')}</p>
                        </div>
                    </div>
                    <Form method="post" action="/logout">
                        <button type="submit" className="p-2 rounded-xl text-surface-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Logout">
                            <LogOut size={20} />
                        </button>
                    </Form>
                </div>
            </div>
        </header>
    );
}
