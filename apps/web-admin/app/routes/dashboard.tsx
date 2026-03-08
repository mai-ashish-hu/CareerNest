import { Outlet, useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireUserSession } from '~/auth.server';
import { Sidebar } from '~/components/Sidebar';
import { Header } from '~/components/Header';
import {
    LayoutDashboard,
    Building2,
    Users,
    Briefcase,
    GraduationCap,
    BarChart3,
    Shield,
    ScrollText,
    Settings,
    Bell,
    CreditCard,
    Activity,
    FileText,
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
        <div className="flex min-h-screen bg-surface-50">
            <Sidebar sections={sidebarSections} />
            <div className="flex-1 ml-64">
                <Header userName={user.name} userRole={user.role} />
                <main className="p-8"><Outlet /></main>
            </div>
        </div>
    );
}
