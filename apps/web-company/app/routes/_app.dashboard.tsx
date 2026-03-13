import { Link, useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
    ArrowRight,
    Briefcase,
    CalendarClock,
    CheckCircle2,
    FileText,
    MapPin,
    TrendingUp,
} from 'lucide-react';
import { Badge, Card, EmptyState, StatCard } from '@careernest/ui';
import { formatDate } from '@careernest/ui';
import {
    loadCompanyDrives,
    loadDriveApplicationSummaries,
    requireCompanyContext,
} from '~/utils/company.server';
import { formatJobTypeLabel, formatSalaryDisplay, getDaysUntil } from '~/utils/company.shared';

export const meta: MetaFunction = () => [{ title: 'Dashboard - Company Portal - CareerNest' }];

const primaryLinkClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-primary-700 hover:shadow-lg';

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user, company } = await requireCompanyContext(request);
    const drives = await loadCompanyDrives(token, user, company);
    const summaries = await loadDriveApplicationSummaries(token, drives);

    const drivesWithMetrics = drives.map((drive) => ({
        ...drive,
        summary: summaries[drive.id] || {
            total: 0,
            applied: 0,
            underReview: 0,
            shortlisted: 0,
            interviewScheduled: 0,
            selected: 0,
            rejected: 0,
        },
    }));

    const totalApplications = drivesWithMetrics.reduce((sum, drive) => sum + drive.summary.total, 0);
    const selectedCandidates = drivesWithMetrics.reduce((sum, drive) => sum + drive.summary.selected, 0);
    const activeDrives = drivesWithMetrics.filter((drive) => drive.status === 'active' && getDaysUntil(drive.deadline) >= 0).length;
    const selectionRate = totalApplications > 0
        ? Math.round((selectedCandidates / totalApplications) * 1000) / 10
        : 0;

    const topDrives = [...drivesWithMetrics]
        .sort((left, right) => {
            if (right.summary.total !== left.summary.total) {
                return right.summary.total - left.summary.total;
            }
            return right.summary.selected - left.summary.selected;
        })
        .slice(0, 4);

    const upcomingDeadlines = [...drivesWithMetrics]
        .filter((drive) => drive.deadline && getDaysUntil(drive.deadline) >= 0)
        .sort((left, right) => new Date(left.deadline).getTime() - new Date(right.deadline).getTime())
        .slice(0, 4);

    return json({
        company,
        stats: {
            totalDrives: drives.length,
            activeDrives,
            totalApplications,
            selectedCandidates,
            selectionRate,
        },
        topDrives,
        upcomingDeadlines,
    });
}

export default function CompanyDashboard() {
    const { company, stats, topDrives, upcomingDeadlines } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-600">Company Portal</p>
                    <h1 className="text-3xl font-bold text-surface-900">{company.name}</h1>
                    <p className="mt-2 max-w-2xl text-surface-500">
                        Track drive performance, shortlist momentum, and deadlines from one place.
                    </p>
                </div>
                <Link to="/drives" className={primaryLinkClass}>
                    Manage Drives <ArrowRight size={16} />
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Active Drives" value={stats.activeDrives} subtitle={`${stats.totalDrives} total live records`} icon={<Briefcase size={24} />} />
                <StatCard title="Applications" value={stats.totalApplications} subtitle="Across all company drives" icon={<FileText size={24} />} />
                <StatCard title="Selections" value={stats.selectedCandidates} subtitle="Candidates marked selected" icon={<CheckCircle2 size={24} />} />
                <StatCard title="Selection Rate" value={`${stats.selectionRate}%`} subtitle="Selected vs total applicants" icon={<TrendingUp size={24} />} />
            </div>

            {topDrives.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr,1fr]">
                    <Card>
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-surface-900">Drive Performance</h2>
                                <p className="text-sm text-surface-500">Most active hiring pipelines right now.</p>
                            </div>
                            <Badge variant="bg-primary-50 text-primary-700">{topDrives.length} tracked</Badge>
                        </div>
                        <div className="space-y-4">
                            {topDrives.map((drive) => (
                                <div key={drive.id} className="rounded-2xl border border-surface-100 bg-surface-50 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <h3 className="font-semibold text-surface-900">{drive.title}</h3>
                                            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-surface-500">
                                                <span>{formatJobTypeLabel(drive.jobType)}</span>
                                                {drive.location && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={13} /> {drive.location}
                                                    </span>
                                                )}
                                                <span>{formatSalaryDisplay(drive.salary, drive.ctcPeriod)}</span>
                                            </div>
                                        </div>
                                        <Badge variant={drive.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-600'}>
                                            {drive.status}
                                        </Badge>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                                        <div className="rounded-xl bg-white p-3">
                                            <p className="text-xs uppercase tracking-wide text-surface-400">Applicants</p>
                                            <p className="mt-1 text-xl font-semibold text-surface-900">{drive.summary.total}</p>
                                        </div>
                                        <div className="rounded-xl bg-white p-3">
                                            <p className="text-xs uppercase tracking-wide text-surface-400">Shortlisted</p>
                                            <p className="mt-1 text-xl font-semibold text-surface-900">{drive.summary.shortlisted + drive.summary.interviewScheduled}</p>
                                        </div>
                                        <div className="rounded-xl bg-white p-3">
                                            <p className="text-xs uppercase tracking-wide text-surface-400">Selected</p>
                                            <p className="mt-1 text-xl font-semibold text-emerald-600">{drive.summary.selected}</p>
                                        </div>
                                        <div className="rounded-xl bg-white p-3">
                                            <p className="text-xs uppercase tracking-wide text-surface-400">Rejected</p>
                                            <p className="mt-1 text-xl font-semibold text-rose-600">{drive.summary.rejected}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <div className="mb-5">
                            <h2 className="text-lg font-semibold text-surface-900">Upcoming Deadlines</h2>
                            <p className="text-sm text-surface-500">Stay ahead of closing applications.</p>
                        </div>
                        {upcomingDeadlines.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingDeadlines.map((drive) => {
                                    const daysLeft = getDaysUntil(drive.deadline);
                                    return (
                                        <div key={drive.id} className="rounded-2xl border border-surface-100 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-surface-900">{drive.title}</p>
                                                    <p className="mt-1 text-sm text-surface-500">{formatDate(drive.deadline)}</p>
                                                </div>
                                                <Badge variant={daysLeft <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-primary-50 text-primary-700'}>
                                                    {daysLeft === 0 ? 'Closes today' : `${daysLeft} days left`}
                                                </Badge>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between text-sm text-surface-500">
                                                <span>{drive.summary.total} applicants</span>
                                                <span>{drive.summary.selected} selected</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyState
                                icon={<CalendarClock size={28} />}
                                title="No upcoming deadlines"
                                description="Create a drive to start collecting applications and track timelines here."
                            />
                        )}
                    </Card>
                </div>
            ) : (
                <Card>
                    <EmptyState
                        icon={<Briefcase size={28} />}
                        title="No drives yet"
                        description="Your dashboard will light up once your team publishes the first hiring drive."
                        action={<Link to="/drives" className={primaryLinkClass}>Go to Drives</Link>}
                    />
                </Card>
            )}
        </div>
    );
}
