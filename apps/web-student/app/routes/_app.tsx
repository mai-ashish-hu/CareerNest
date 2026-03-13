import { Outlet, useLoaderData } from '@remix-run/react';
import type { ShouldRevalidateFunction } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useState, useCallback } from 'react';
import { requireUserSession } from '~/auth.server';
import { Sidebar } from '~/components/Sidebar';
import { Header } from '~/components/Header';
import { api } from '@careernest/lib';
import { LayoutDashboard, UserCircle, Briefcase, FileText, Megaphone, Settings, Search, MessagesSquare, BookOpen, Video } from 'lucide-react';

const links = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/profile', label: 'My Profile', icon: <UserCircle size={20} /> },
    { to: '/network', label: 'Student Network', icon: <Search size={20} /> },
    { to: '/chat', label: 'Campus Chat', icon: <MessagesSquare size={20} /> },
    { to: '/drives', label: 'Drives', icon: <Briefcase size={20} /> },
    { to: '/applications', label: 'Applications', icon: <FileText size={20} /> },
    { to: '/courses', label: 'Courses', icon: <BookOpen size={20} /> },
    { to: '/interviews', label: 'Interviews', icon: <Video size={20} /> },
    { to: '/announcements', label: 'Announcements', icon: <Megaphone size={20} /> },
    { to: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

export const shouldRevalidate: ShouldRevalidateFunction = ({
    currentUrl,
    nextUrl,
    formMethod,
    defaultShouldRevalidate,
}) => {
    if (formMethod && formMethod !== 'GET') {
        return defaultShouldRevalidate;
    }

    if (
        currentUrl.pathname === nextUrl.pathname
        && currentUrl.search === nextUrl.search
    ) {
        return defaultShouldRevalidate;
    }

    return false;
};

export async function loader({ request }: LoaderFunctionArgs) {
    const { user, token } = await requireUserSession(request);
    let profileSummary = {
        profilePicture: '',
        completionScore: 0,
        currentYear: '',
        headline: '',
    };

    try {
        const profileRes = await api.students.getMyProfile(token) as {
            data: {
                summary: {
                    profilePicture: string;
                    completionScore: number;
                    currentYear: string;
                    headline: string;
                };
            };
        };
        profileSummary = {
            profilePicture: profileRes?.data?.summary?.profilePicture || '',
            completionScore: profileRes?.data?.summary?.completionScore || 0,
            currentYear: profileRes?.data?.summary?.currentYear || '',
            headline: profileRes?.data?.summary?.headline || '',
        };
    } catch {
        // profile not set up yet
    }

    return json({ user, profileSummary });
}

export default function StudentLayout() {
    const { user, profileSummary } = useLoaderData<typeof loader>();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);
    const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

    return (
        <div className="relative flex min-h-screen">
            <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.08),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.08),_transparent_26%)]" />

            <Sidebar
                links={links}
                isOpen={sidebarOpen}
                onClose={closeSidebar}
                student={{
                    name: user.name,
                    role: user.role,
                    profilePicture: profileSummary.profilePicture,
                    currentYear: profileSummary.currentYear,
                    headline: profileSummary.headline,
                    completionScore: profileSummary.completionScore,
                }}
            />

            <div className="min-w-0 flex-1 lg:ml-72">
                <Header
                    userName={user.name}
                    userRole={user.role}
                    profilePicture={profileSummary.profilePicture}
                    completionScore={profileSummary.completionScore}
                    currentYear={profileSummary.currentYear}
                    onMenuToggle={toggleSidebar}
                />
                <main className="relative p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto max-w-7xl">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
