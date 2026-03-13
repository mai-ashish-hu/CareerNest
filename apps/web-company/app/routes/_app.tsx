import { useState } from 'react';
import { Outlet, useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Briefcase, LayoutDashboard, Settings, Calendar } from 'lucide-react';
import { Header } from '~/components/Header';
import { Sidebar } from '~/components/Sidebar';
import { requireCompanyUserSession } from '~/utils/company.server';

const links = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/drives', label: 'My Drives', icon: <Briefcase size={20} /> },
    { to: '/interviews', label: 'Interviews', icon: <Calendar size={20} /> },
    { to: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

export async function loader({ request }: LoaderFunctionArgs) {
    const { user } = await requireCompanyUserSession(request);
    return json({ user });
}

export default function CompanyLayout() {
    const { user } = useLoaderData<typeof loader>();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-surface-50">
            <Sidebar links={links} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 lg:ml-64">
                <Header userName={user.name} userRole={user.role} onMenuToggle={() => setSidebarOpen(true)} />
                <main className="p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
