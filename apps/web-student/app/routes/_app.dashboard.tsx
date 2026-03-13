import { Link, useLoaderData } from '@remix-run/react';
import { Briefcase, Bell, ArrowRight, Building2, IndianRupee, MapPin, FileText, TrendingUp, Sparkles, Calendar, UserCircle2 } from 'lucide-react';
import { Card, Badge, Avatar, EmptyState } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';
import { StudentMetricCard, StudentMetricGrid, StudentPageHero } from '~/components/StudentPageHero';

export const meta: MetaFunction = () => [{ title: 'Dashboard – Student – CareerNest' }];

interface DashDrive {
    id: string;
    title: string;
    company: string;
    salary: number;
    location: string;
    deadline: string;
    department: string[];
    vacancies: number;
    jobType: string;
}

interface DashAnnouncement {
    id: string;
    title: string;
    createdAt: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    const tenantId = user.tenantId;

    const [drivesRes, announcementsRes, profileRes, applicationsRes] = await Promise.all([
        api.drives.list(token, `${tenantId ? `tenantId=${tenantId}&` : ''}limit=5`).catch(() => ({ data: [] })) as Promise<{ data: any[] }>,
        api.announcements.list(token, 'limit=5').catch(() => ({ data: [] })) as Promise<{ data: any[] }>,
        api.students.getMyProfile(token).catch(() => ({ data: null })) as Promise<{ data: any }>,
        api.applications.list(token, 'limit=100').catch(() => ({ data: [], total: 0 })) as Promise<{ data: any[]; total: number }>,
    ]);

    const drives: DashDrive[] = (drivesRes.data || []).map((d: any) => {
        const companyRef = d.companies;
        const companyName = Array.isArray(companyRef)
            ? (companyRef[0]?.name || 'Unknown Company')
            : (companyRef?.name || 'Unknown Company');
        return {
            id: d.$id || '',
            title: d.title || '',
            company: companyName,
            salary: d.salary ?? 0,
            location: d.location || '',
            deadline: d.deadline || '',
            department: Array.isArray(d.department) ? d.department : [],
            vacancies: d.vacancies ?? 0,
            jobType: d.jobType || '',
        };
    });

    const announcements: DashAnnouncement[] = (announcementsRes.data || []).map((a: any) => ({
        id: a.$id || '',
        title: a.title || '',
        createdAt: a.$createdAt || '',
    }));

    const profile = profileRes.data ? {
        name: profileRes.data.identity?.name || '',
        department: profileRes.data.identity?.departmentName || '',
        currentYear: profileRes.data.summary?.currentYear || '',
        completionScore: profileRes.data.summary?.completionScore ?? 0,
    } : null;

    const applicationCount = (applicationsRes.data || []).length;

    return json({ user, drives, announcements, profile, applicationCount });
}

function formatSalary(salary: number): string {
    if (salary >= 100000) return `₹${(salary / 100000).toFixed(1)} LPA`;
    if (salary > 0) return `₹${salary.toLocaleString('en-IN')}`;
    return 'Not disclosed';
}

function getDaysLeft(deadline: string): number {
    if (!deadline) return 0;
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export default function StudentDashIndex() {
    const { user, drives, announcements, profile, applicationCount } = useLoaderData<typeof loader>() as {
        user: { name: string; role: string };
        drives: DashDrive[];
        announcements: DashAnnouncement[];
        profile: { name: string; department: string; currentYear: string; completionScore: number } | null;
        applicationCount: number;
    };

    const upcomingDeadlines = drives.filter(d => getDaysLeft(d.deadline) > 0 && getDaysLeft(d.deadline) <= 7).length;

    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
            <StudentPageHero
                tone="emerald"
                badge="Daily student cockpit"
                title={`${getGreeting()}, ${profile?.name || user.name}`}
                description={
                    profile
                        ? `${profile.department}${profile.currentYear ? ` · ${profile.currentYear}` : ''}. Stay ready for the next drive, shortlist, or campus update.`
                        : 'Your placement journey at a glance, with the next best actions surfaced up front.'
                }
                actions={
                    <>
                        <Link
                            to="/drives"
                            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-surface-950 transition hover:bg-emerald-50"
                        >
                            Browse drives
                            <ArrowRight size={16} className="ml-2" />
                        </Link>
                        <Link
                            to="/profile"
                            className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                        >
                            Build profile
                            <UserCircle2 size={16} className="ml-2" />
                        </Link>
                    </>
                }
                aside={
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                                Quick read
                            </p>
                            <p className="mt-2 text-2xl font-bold text-white">
                                {upcomingDeadlines > 0 ? `${upcomingDeadlines} deadlines` : 'No urgent deadlines'}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/75">
                                {upcomingDeadlines > 0
                                    ? 'You have active applications closing this week. Push the high-fit ones first.'
                                    : 'This is a good moment to strengthen your profile and review fresh opportunities.'}
                            </p>
                        </div>

                        {profile ? (
                            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-white/75">
                                        Profile strength
                                    </span>
                                    <span className="text-lg font-bold text-white">
                                        {profile.completionScore}%
                                    </span>
                                </div>
                                <div className="mt-3 h-2.5 rounded-full bg-white/10">
                                    <div
                                        className="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400"
                                        style={{ width: `${profile.completionScore}%` }}
                                    />
                                </div>
                            </div>
                        ) : null}
                    </div>
                }
            >
                {profile && profile.completionScore < 80 ? (
                    <div className="flex items-start gap-3 rounded-[1.6rem] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-md">
                        <Sparkles size={18} className="mt-0.5 shrink-0 text-amber-300" />
                        <p className="text-sm leading-6 text-white/80">
                            Your profile is {profile.completionScore}% complete. Add projects, skills, and a sharper headline to stand out faster in drives and campus discovery.
                        </p>
                    </div>
                ) : null}
            </StudentPageHero>

            <StudentMetricGrid>
                <StudentMetricCard
                    label="Active Drives"
                    value={drives.length}
                    hint="Fresh opportunities currently visible to you."
                    icon={<Briefcase size={20} />}
                    tone="sky"
                />
                <StudentMetricCard
                    label="Applications"
                    value={applicationCount}
                    hint="Everything you have submitted so far."
                    icon={<FileText size={20} />}
                    tone="emerald"
                />
                <StudentMetricCard
                    label="Announcements"
                    value={announcements.length}
                    hint="Latest updates from your placement cell."
                    icon={<Bell size={20} />}
                    tone="amber"
                />
                <StudentMetricCard
                    label="Due This Week"
                    value={upcomingDeadlines}
                    hint="Prioritize these before you lose the window."
                    icon={<Calendar size={20} />}
                    tone={upcomingDeadlines > 0 ? 'amber' : 'ink'}
                />
            </StudentMetricGrid>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Recent Drives */}
                <Card className="student-surface-card lg:col-span-2">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-semibold text-surface-900">Recent Drives</h3>
                        <Link to="/drives" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                            View all <ArrowRight size={14} />
                        </Link>
                    </div>
                    {drives.length > 0 ? (
                        <div className="space-y-3">
                            {drives.map((drive) => {
                                const daysLeft = getDaysLeft(drive.deadline);
                                return (
                                    <Link key={drive.id} to="/drives" className="block">
                                        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-surface-50 hover:bg-surface-100/80 transition-all duration-200 group cursor-pointer">
                                            <Avatar name={drive.company || drive.title} size="md" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-surface-900 truncate group-hover:text-primary-700 transition-colors">{drive.title}</p>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-surface-500 mt-1">
                                                {drive.company && (
                                                        <span className="flex items-center gap-1"><Building2 size={12} /> {drive.company}</span>
                                                    )}
                                                    <span className="flex items-center gap-1"><IndianRupee size={12} /> {formatSalary(drive.salary)}</span>
                                                    {drive.location && (
                                                        <span className="hidden sm:flex items-center gap-1"><MapPin size={12} /> {drive.location}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0 hidden sm:block">
                                                <Badge variant="bg-primary-50 text-primary-700">{drive.jobType || 'Full-time'}</Badge>
                                                {daysLeft > 0 && (
                                                    <p className={`text-xs mt-1 font-medium ${daysLeft <= 3 ? 'text-rose-500' : daysLeft <= 7 ? 'text-amber-600' : 'text-surface-400'}`}>
                                                        {daysLeft}d left
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState
                            icon={<Briefcase size={24} />}
                            title="No drives yet"
                            description="Check back later for new placement opportunities."
                        />
                    )}
                </Card>

                {/* Right Column */}
                <div className="space-y-4 sm:space-y-6">
                    {/* Profile Completion */}
                    {profile && (
                        <Card className="student-surface-card !p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-surface-900 text-sm">Profile Strength</h3>
                                <span className="text-sm font-bold text-primary-600">{profile.completionScore}%</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-surface-100 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        profile.completionScore >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                                        profile.completionScore >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                                        'bg-gradient-to-r from-rose-400 to-rose-500'
                                    }`}
                                    style={{ width: `${profile.completionScore}%` }}
                                />
                            </div>
                            <Link to="/profile" className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                                <TrendingUp size={12} /> {profile.completionScore >= 80 ? 'View profile' : 'Improve profile'}
                            </Link>
                        </Card>
                    )}

                    {/* Announcements */}
                    <Card className="student-surface-card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-surface-900">Announcements</h3>
                            <Link to="/announcements" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                                See all →
                            </Link>
                        </div>
                        {announcements.length > 0 ? (
                            <div className="space-y-2.5">
                                {announcements.map((ann) => (
                                    <Link key={ann.id} to="/announcements" className="block">
                                        <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-surface-50 transition-colors cursor-pointer group">
                                            <div className="p-1.5 rounded-lg flex-shrink-0 mt-0.5 bg-surface-100 text-surface-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
                                                <Bell size={12} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm text-surface-700 font-medium leading-snug truncate">{ann.title}</p>
                                                <p className="text-xs text-surface-400 mt-0.5">
                                                    {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-surface-400 text-center py-6">No announcements yet.</p>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
