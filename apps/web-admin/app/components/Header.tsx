import { Form } from '@remix-run/react';
import { Bell, LogOut, Search } from 'lucide-react';

export function Header({ userName, userRole }: { userName: string; userRole: string }) {
    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="hidden md:block">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Super Admin
                        </p>
                        <p className="text-sm text-slate-700">CareerNest Admin Panel</p>
                    </div>

                    <div className="relative hidden max-w-md flex-1 md:block">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search colleges, users, companies"
                            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                    >
                        <Bell size={18} />
                    </button>

                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-sm font-semibold text-white">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-medium text-slate-900">{userName}</p>
                            <p className="text-xs capitalize text-slate-500">{userRole.replace(/_/g, ' ')}</p>
                        </div>
                    </div>

                    <Form method="post" action="/logout">
                        <button
                            type="submit"
                            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    </Form>
                </div>
            </div>
        </header>
    );
}
