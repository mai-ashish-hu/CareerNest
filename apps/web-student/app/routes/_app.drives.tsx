import { useState } from 'react';
import { Search, Briefcase, Calendar, MapPin, IndianRupee, Users, Clock, Building2, GraduationCap, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Card, Badge, Button, EmptyState, Avatar } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';
import { StudentMetricCard, StudentMetricGrid, StudentPageHero } from '~/components/StudentPageHero';

export const meta: MetaFunction = () => [{ title: 'Drives – Student – CareerNest' }];

interface Drive {
    id: string;
    title: string;
    company: string;
    salary: number;
    location: string;
    department: string[];
    CGPA: number;
    Backlogs: number;
    deadline: string;
    vacancies: number;
    jobType: string;
    jobLevel: string;
    experience: string;
    ctcPeriod: string;
    studyingYear: string;
    description: string;
    externalLink: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    const tenantId = user.tenantId;

    const [drivesRes, applicationsRes] = await Promise.all([
        api.drives.list(token, `${tenantId ? `tenantId=${tenantId}&` : ''}limit=500`).catch(() => ({ data: [], total: 0 })),
        api.applications.list(token, 'limit=500').catch(() => ({ data: [], total: 0 })),
    ]) as [any, any];

    const drives: Drive[] = (drivesRes.data || []).map((d: any) => {
        const companyRef = d.companies;
        const companyName = Array.isArray(companyRef)
            ? (companyRef[0]?.name || 'Unknown Company')
            : (companyRef?.name || 'Unknown Company');
        return {
            id: d.$id || d.id || '',
            title: d.title || '',
            company: companyName,
            salary: d.salary ?? 0,
            location: d.location || '',
            department: Array.isArray(d.department) ? d.department : (d.department ? [d.department] : []),
            CGPA: d.CGPA ?? 0,
            Backlogs: d.Backlogs ?? 0,
            deadline: d.deadline || '',
            vacancies: d.vacancies ?? 0,
            jobType: d.jobType || '',
            jobLevel: d.jobLevel || '',
            experience: d.experience || 'fresher',
            ctcPeriod: d.ctcPeriod || 'annual',
            studyingYear: d.studyingYear || '',
            description: d.description || '',
            externalLink: d.externalLink || '',
        };
    });

    const appliedDriveIds: string[] = (applicationsRes.data || []).map((a: any) => a.driveId as string);

    return json({ drives, appliedDriveIds });
}

function formatSalary(salary: number): string {
    if (salary >= 100000) return `₹${(salary / 100000).toFixed(1)} LPA`;
    if (salary > 0) return `₹${salary.toLocaleString('en-IN')}`;
    return 'Not disclosed';
}

function getDaysLeft(deadline: string): number {
    if (!deadline) return -1;
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Drives() {
    const { drives, appliedDriveIds } = useLoaderData<typeof loader>() as {
        drives: Drive[];
        appliedDriveIds: string[];
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('');

    const appliedSet = new Set(appliedDriveIds);

    const departments = [...new Set(drives.flatMap(d => d.department))].sort();
    const urgentClosingCount = drives.filter((drive) => {
        const daysLeft = getDaysLeft(drive.deadline);
        return daysLeft >= 0 && daysLeft <= 7;
    }).length;

    const filtered = drives.filter((d) => {
        const q = searchQuery.toLowerCase();
        const matchSearch = d.title.toLowerCase().includes(q) ||
            d.company.toLowerCase().includes(q) ||
            d.location.toLowerCase().includes(q);
        const matchDept = !deptFilter || d.department.includes(deptFilter);
        return matchSearch && matchDept;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <StudentPageHero
                tone="sky"
                badge="Opportunity board"
                title="Placement drives that are easy to scan and act on"
                description="Search by company, role, or location. Filter by department, compare deadlines, and apply without leaving the same flow."
                aside={
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                                Right now
                            </p>
                            <p className="mt-2 text-2xl font-bold text-white">
                                {urgentClosingCount > 0 ? `${urgentClosingCount} closing soon` : 'No urgent rush'}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/75">
                                {urgentClosingCount > 0
                                    ? 'Prioritize the drives closing in the next seven days before exploring the rest.'
                                    : 'Use this time to shortlist roles that fit your skill set and branch.'}
                            </p>
                        </div>

                        <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
                            <div className="flex items-center justify-between text-sm text-white/75">
                                <span>Already applied</span>
                                <span className="text-lg font-bold text-white">
                                    {appliedDriveIds.length}
                                </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-sm text-white/75">
                                <span>Department filters</span>
                                <span className="font-semibold text-white">
                                    {departments.length}
                                </span>
                            </div>
                        </div>
                    </div>
                }
            />

            <StudentMetricGrid>
                <StudentMetricCard
                    label="Visible Drives"
                    value={drives.length}
                    hint="Total opportunities currently in your campus feed."
                    icon={<Briefcase size={20} />}
                    tone="sky"
                />
                <StudentMetricCard
                    label="Filtered Results"
                    value={filtered.length}
                    hint="Updates live as you search and narrow the list."
                    icon={<Search size={20} />}
                    tone="ink"
                />
                <StudentMetricCard
                    label="Applied"
                    value={appliedDriveIds.length}
                    hint="Drives you have already submitted for."
                    icon={<CheckCircle2 size={20} />}
                    tone="emerald"
                />
                <StudentMetricCard
                    label="Closing Soon"
                    value={urgentClosingCount}
                    hint="Deadlines within the next seven days."
                    icon={<Clock size={20} />}
                    tone="amber"
                />
            </StudentMetricGrid>

            {/* Search & Filters */}
            <Card className="student-filter-bar !p-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                        <input
                            type="text"
                            placeholder="Search by title, company or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        />
                    </div>
                    {departments.length > 0 && (
                        <select
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            className="form-input sm:w-44 !py-2.5"
                        >
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    )}
                </div>
            </Card>

            {/* Drive Cards */}
            {filtered.length > 0 ? (
                <div className="space-y-4">
                    {filtered.map((drive) => {
                        const daysLeft = getDaysLeft(drive.deadline);
                        const isExpired = daysLeft < 0;
                        const isApplied = appliedSet.has(drive.id);
                        return (
                            <Card key={drive.id} hover className="student-surface-card !p-0 overflow-hidden">
                                <div className="p-5">
                                    <div className="flex items-start gap-4">
                                        <Avatar name={drive.company || drive.title} size="lg" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-surface-900">{drive.title}</h3>
                                                    {drive.company && <p className="text-surface-500 flex items-center gap-1"><Building2 size={14} /> {drive.company}</p>}
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {isApplied && (
                                                        <Badge variant="bg-emerald-100 text-emerald-700">
                                                            <CheckCircle2 size={12} className="inline mr-1" />Applied
                                                        </Badge>
                                                    )}
                                                    <Badge variant={isExpired ? 'bg-surface-100 text-surface-500' : 'bg-emerald-100 text-emerald-700'}>
                                                        {isExpired ? 'Closed' : 'Active'}
                                                    </Badge>
                                                    {drive.jobType && <Badge variant="bg-blue-50 text-blue-700">{drive.jobType}</Badge>}
                                                </div>
                                            </div>

                                            {drive.description && (
                                                <p className="mt-2 text-sm text-surface-600 line-clamp-2">{drive.description}</p>
                                            )}

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-surface-500">
                                                <span className="flex items-center gap-1.5">
                                                    <IndianRupee size={14} className="text-surface-400" />
                                                    <span className="font-semibold text-surface-700">{formatSalary(drive.salary)}</span>
                                                    {drive.ctcPeriod && <span className="text-xs">/{drive.ctcPeriod}</span>}
                                                </span>
                                                {drive.location && (
                                                    <span className="flex items-center gap-1.5">
                                                        <MapPin size={14} className="text-surface-400" /> {drive.location}
                                                    </span>
                                                )}
                                                {drive.deadline && (
                                                    <span className="hidden sm:flex items-center gap-1.5">
                                                        <Calendar size={14} className="text-surface-400" />
                                                        {new Date(drive.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                                {drive.vacancies > 0 && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Users size={14} className="text-surface-400" /> {drive.vacancies} openings
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-3 bg-surface-50 border-t border-surface-100">
                                    <div className="flex items-center gap-3 text-xs text-surface-500">
                                        {drive.CGPA > 0 && <span>CGPA ≥ {drive.CGPA}</span>}
                                        {drive.Backlogs > 0 && <span>· Max Backlogs: {drive.Backlogs}</span>}
                                        {drive.department.length > 0 && (
                                            <>
                                                <span className="text-surface-300">|</span>
                                                <span className="hidden sm:inline">{drive.department.join(', ')}</span>
                                                <span className="sm:hidden">{drive.department.length} dept{drive.department.length !== 1 ? 's' : ''}</span>
                                            </>
                                        )}
                                        {drive.studyingYear && (
                                            <>
                                                <span className="text-surface-300 hidden sm:inline">|</span>
                                                <span className="hidden sm:flex items-center gap-1"><GraduationCap size={12} /> {drive.studyingYear} Year</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isExpired && daysLeft >= 0 && (
                                            <span className={`text-xs font-medium ${daysLeft <= 7 ? 'text-rose-500' : 'text-amber-600'}`}>
                                                <Clock size={12} className="inline mr-1" />{daysLeft} days left
                                            </span>
                                        )}
                                        {drive.externalLink && (
                                            <a href={drive.externalLink} target="_blank" rel="noopener noreferrer">
                                                <Button size="sm" variant="ghost">
                                                    <ExternalLink size={14} /> View JD
                                                </Button>
                                            </a>
                                        )}
                                        {isApplied ? (
                                            <Button size="sm" variant="secondary" disabled>
                                                <CheckCircle2 size={14} className="text-emerald-600" /> Applied
                                            </Button>
                                        ) : (
                                            <Link to={`/drives/${drive.id}`}>
                                                <Button size="sm" disabled={isExpired}>
                                                    {isExpired ? 'Closed' : 'View & Apply'}
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="student-surface-card">
                    <EmptyState
                        icon={<Briefcase size={28} />}
                        title="No drives found"
                        description={searchQuery || deptFilter ? 'Try adjusting your search or filters.' : 'No placement drives available right now. Check back later.'}
                    />
                </Card>
            )}

        </div>
    );
}
