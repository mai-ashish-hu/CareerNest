import { Form, useLocation } from '@remix-run/react';
import { Bell, LogOut, Menu, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

function getPageMeta(pathname: string): { title: string; description: string } {
    if (pathname.startsWith('/profile')) {
        return {
            title: 'Student Profile',
            description: 'Shape the version of you that your campus sees.',
        };
    }
    if (pathname.startsWith('/network')) {
        return {
            title: 'Campus Network',
            description: 'Discover peers, collaborators, and student talent nearby.',
        };
    }
    if (pathname.startsWith('/chat')) {
        return {
            title: 'Campus Chat',
            description: 'Talk with students inside your college community.',
        };
    }
    if (pathname.startsWith('/drives')) {
        return {
            title: 'Placement Drives',
            description: 'Find open opportunities and apply without friction.',
        };
    }
    if (pathname.startsWith('/applications')) {
        return {
            title: 'Applications',
            description: 'Track every stage of your placement journey in one place.',
        };
    }
    if (pathname.startsWith('/courses')) {
        return {
            title: 'Courses',
            description: 'Learn from curated content shared by your placement cell.',
        };
    }
    if (pathname.startsWith('/interviews')) {
        return {
            title: 'Interviews',
            description: 'View scheduled interviews and join video calls.',
        };
    }
    if (pathname.startsWith('/announcements')) {
        return {
            title: 'Announcements',
            description: 'Stay on top of updates from your placement cell.',
        };
    }
    if (pathname.startsWith('/settings')) {
        return {
            title: 'Settings',
            description: 'Control your account, privacy, and password.',
        };
    }

    return {
        title: 'Dashboard',
        description: 'Keep your placement momentum moving every day.',
    };
}

export function Header({
    userName,
    userRole,
    profilePicture,
    completionScore,
    currentYear,
    onMenuToggle,
}: {
    userName: string;
    userRole: string;
    profilePicture?: string;
    completionScore?: number;
    currentYear?: string;
    onMenuToggle: () => void;
}) {
    const location = useLocation();
    const [hasImageError, setHasImageError] = useState(false);
    const pageMeta = getPageMeta(location.pathname);
    const today = new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
    }).format(new Date());

    useEffect(() => {
        setHasImageError(false);
    }, [profilePicture]);

    return (
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/70 backdrop-blur-2xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <button
                        onClick={onMenuToggle}
                        className="rounded-2xl border border-surface-200/80 bg-white p-2.5 text-surface-500 transition hover:border-surface-300 hover:text-surface-700 lg:hidden"
                        aria-label="Toggle menu"
                    >
                        <Menu size={22} />
                    </button>

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">
                            <span>{today}</span>
                            {currentYear ? (
                                <>
                                    <span className="text-surface-300">/</span>
                                    <span>{currentYear}</span>
                                </>
                            ) : null}
                        </div>
                        <h1 className="mt-1 truncate text-2xl font-bold text-surface-950 sm:text-[2rem]">
                            {pageMeta.title}
                        </h1>
                        <p className="hidden text-sm text-surface-500 sm:block">
                            {pageMeta.description}
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    {typeof completionScore === 'number' ? (
                        <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 md:flex">
                            <Sparkles size={14} />
                            Profile {completionScore}%
                        </div>
                    ) : null}

                    <button className="relative rounded-2xl border border-surface-200/80 bg-white p-2.5 text-surface-400 transition hover:border-surface-300 hover:text-surface-700">
                        <Bell size={18} />
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                    </button>

                    <div className="flex items-center gap-2 rounded-[1.2rem] border border-white/70 bg-white/90 px-2.5 py-2 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.9)] sm:gap-3 sm:px-3.5">
                        {profilePicture && !hasImageError ? (
                            <img
                                src={profilePicture}
                                alt={userName}
                                crossOrigin="anonymous"
                                onError={() => setHasImageError(true)}
                                className="h-10 w-10 rounded-2xl object-cover"
                            />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-600 text-sm font-bold text-white">
                                {userName.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div className="hidden sm:block">
                            <p className="text-sm font-semibold leading-tight text-surface-900">
                                {userName}
                            </p>
                            <p className="text-xs capitalize text-surface-400">
                                {userRole.replace(/_/g, ' ')}
                            </p>
                        </div>
                    </div>

                    <Form method="post" action="/logout">
                        <button
                            type="submit"
                            className="rounded-2xl border border-surface-200/80 bg-white p-2.5 text-surface-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
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
