import { Outlet, useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireUserSession } from '~/auth.server';
import { Sidebar } from '~/components/Sidebar';
import { Header } from '~/components/Header';
import {
    BarChart3,
    Bell,
    Briefcase,
    Building2,
    CreditCard,
    FileText,
    GraduationCap,
    LayoutDashboard,
    ScrollText,
    Settings,
    Shield,
    Users,
} from 'lucide-react';

const sidebarSections = [
    {
        title: 'Overview',
        links: [
            { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
            { to: '/dashboard/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
        ],
    },
    {
        title: 'Tenant Management',
        links: [
            { to: '/dashboard/tenants', label: 'Colleges', icon: <Building2 size={18} /> },
            { to: '/dashboard/subscriptions', label: 'Subscriptions', icon: <CreditCard size={18} /> },
        ],
    },
    {
        title: 'User Governance',
        links: [
            { to: '/dashboard/users', label: 'All Users', icon: <Users size={18} /> },
            { to: '/dashboard/companies', label: 'Companies', icon: <Briefcase size={18} /> },
            { to: '/dashboard/drives', label: 'Drives', icon: <GraduationCap size={18} /> },
        ],
    },
    {
        title: 'Security & Compliance',
        links: [
            { to: '/dashboard/audit-logs', label: 'Audit Logs', icon: <ScrollText size={18} /> },
            { to: '/dashboard/security', label: 'Security', icon: <Shield size={18} /> },
        ],
    },
    {
        title: 'System',
        links: [
            { to: '/dashboard/announcements', label: 'Announcements', icon: <Bell size={18} /> },
            { to: '/dashboard/reports', label: 'Reports', icon: <FileText size={18} /> },
            { to: '/dashboard/settings', label: 'Settings', icon: <Settings size={18} /> },
        ],
    },
];

export async function loader({ request }: LoaderFunctionArgs) {
    const { user } = await requireUserSession(request);
    return json({ user });
}

export default function AdminLayout() {
    const { user } = useLoaderData<typeof loader>();

    return (
        <div className="min-h-screen bg-slate-100">
            <Sidebar sections={sidebarSections} />
            <div className="ml-64 min-h-screen">
                <Header userName={user.name} userRole={user.role} />
                <main className="mx-auto max-w-[1440px] px-6 py-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
