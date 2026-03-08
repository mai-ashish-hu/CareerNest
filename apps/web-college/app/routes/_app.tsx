import { Outlet, useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireUserSession, logout } from '~/auth.server';
import { api } from '@careernest/lib';
import { Sidebar } from '~/components/Sidebar';
import { Header } from '~/components/Header';
import { LayoutDashboard, Building2, Briefcase, Users, GraduationCap, Megaphone, BarChart3, Settings } from 'lucide-react';

const links = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/companies', label: 'Companies', icon: <Building2 size={20} /> },
    { to: '/drives', label: 'Drives', icon: <Briefcase size={20} /> },
    { to: '/students', label: 'Students', icon: <Users size={20} /> },
    { to: '/courses', label: 'Courses', icon: <GraduationCap size={20} /> },
    { to: '/announcements', label: 'Announcements', icon: <Megaphone size={20} /> },
    { to: '/analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
    { to: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);

    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) {
        throw await logout(request);
    }

    let collegeName = '';
    try {
        const res = await api.tenants.getById(token, user.tenantId) as { data: any };
        collegeName = res.data?.collegeName || res.data?.name || '';
    } catch {
        // ignore – college name is optional for layout
    }

    return json({ user, collegeName });
}

export default function AppLayout() {
    const { user, collegeName } = useLoaderData<typeof loader>() as any;
    return (
        <div className="flex min-h-screen bg-surface-50">
            <Sidebar links={links} collegeName={collegeName} />
            <div className="flex-1 ml-64">
                <Header userName={user.name} userRole={user.role} collegeName={collegeName} />
                <main className="p-8"><Outlet /></main>
            </div>
        </div>
    );
}
