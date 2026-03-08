import { Outlet, useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireUserSession } from '~/auth.server';
import { Sidebar } from '~/components/Sidebar';
import { Header } from '~/components/Header';
import { LayoutDashboard, Briefcase, Settings } from 'lucide-react';

const links = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/drives', label: 'My Drives', icon: <Briefcase size={20} /> },
    { to: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

export async function loader({ request }: LoaderFunctionArgs) {
    const { user } = await requireUserSession(request);
    return json({ user });
}

export default function CompanyLayout() {
    const { user } = useLoaderData<typeof loader>();
    return (
        <div className="flex min-h-screen bg-surface-50">
            <Sidebar links={links} />
            <div className="flex-1 ml-64">
                <Header userName={user.name} userRole={user.role} />
                <main className="p-8"><Outlet /></main>
            </div>
        </div>
    );
}
