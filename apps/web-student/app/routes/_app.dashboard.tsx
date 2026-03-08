import { Link, useLoaderData } from '@remix-run/react';
import { Briefcase, Bell, ArrowRight, Building2, IndianRupee, MapPin, FileText } from 'lucide-react';
import { Card, Badge, Avatar, EmptyState } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

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

    const [drivesRes, announcementsRes, profileRes] = await Promise.all([
        api.drives.list(token, `${tenantId ? `tenantId=${tenantId}&` : ''}limit=5`).catch(() => ({ data: [] })) as Promise<{ data: any[] }>,
        api.announcements.list(token, 'limit=5').catch(() => ({ data: [] })) as Promise<{ data: any[] }>,
        api.students.getMyProfile(token).catch(() => ({ data: null })) as Promise<{ data: any }>,
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
        name: profileRes.data.name || '',
        department: profileRes.data.department || '',
        enrollmentYear: profileRes.data.enrollmentYear ?? 0,
    } : null;

    return json({ user, drives, announcements, profile });
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

export default function StudentDashIndex() {
    const { user, drives, announcements, profile } = useLoaderData<typeof loader>() as {
        user: { name: string; role: string };
        drives: DashDrive[];
        announcements: DashAnnouncement[];
        profile: { name: string; department: string; enrollmentYear: number } | null;
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-surface-900">Welcome back, {profile?.name || user.name}!</h1>
                    <p className="text-surface-500 mt-1">
                        {profile ? `${profile.department} · Batch ${profile.enrollmentYear}` : 'Your placement journey at a glance'}
                    </p>
                </div>
                <Link to="/drives">
                    <button className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors flex items-center gap-2">
                        Browse Drives <ArrowRight size={16} />
                    </button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="!p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Briefcase size={22} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{drives.length}</p>
                            <p className="text-sm text-surface-500">Active Drives</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-amber-50 text-amber-600"><Bell size={22} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{announcements.length}</p>
                            <p className="text-sm text-surface-500">Announcements</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><FileText size={22} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">0</p>
                            <p className="text-sm text-surface-500">My Applications</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Drives */}
                <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-semibold text-surface-900">Recent Drives</h3>
                        <Link to="/drives" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                            View all <ArrowRight size={14} />
                        </Link>
                    </div>
                    {drives.length > 0 ? (
                        <div className="space-y-4">
                            {drives.map((drive) => {
                                const daysLeft = getDaysLeft(drive.deadline);
                                return (
                                    <div key={drive.id} className="flex items-center gap-4 p-4 rounded-xl bg-surface-50 hover:bg-surface-100/50 transition-colors">
                                        <Avatar name={drive.company || drive.title} size="md" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-surface-900">{drive.title}</p>
                                            <div className="flex items-center gap-3 text-sm text-surface-500 mt-1">
                                                {drive.company && (
                                                    <span className="flex items-center gap-1"><Building2 size={13} /> {drive.company}</span>
                                                )}
                                                <span className="flex items-center gap-1"><IndianRupee size={13} /> {formatSalary(drive.salary)}</span>
                                                {drive.location && (
                                                    <span className="flex items-center gap-1"><MapPin size={13} /> {drive.location}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <Badge variant="bg-primary-50 text-primary-700">{drive.jobType || 'Full-time'}</Badge>
                                            {daysLeft > 0 && (
                                                <p className={`text-xs mt-1 font-medium ${daysLeft <= 7 ? 'text-rose-500' : 'text-amber-600'}`}>
                                                    {daysLeft}d left
                                                </p>
                                            )}
                                        </div>
                                    </div>
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

                {/* Right Column — Announcements */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-surface-900">Announcements</h3>
                        <Link to="/announcements" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                            See all →
                        </Link>
                    </div>
                    {announcements.length > 0 ? (
                        <div className="space-y-3">
                            {announcements.map((ann) => (
                                <div key={ann.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer">
                                    <div className="p-1 rounded-md flex-shrink-0 mt-0.5 bg-surface-100 text-surface-400">
                                        <Bell size={12} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-surface-700 font-medium leading-snug">{ann.title}</p>
                                        <p className="text-xs text-surface-400 mt-0.5">
                                            {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-surface-400 text-center py-6">No announcements yet.</p>
                    )}
                </Card>
            </div>
        </div>
    );
}
