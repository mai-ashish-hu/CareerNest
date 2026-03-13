import { Link, useLoaderData } from '@remix-run/react';
import { Users, Building2, Briefcase, TrendingUp, BarChart3, Megaphone, ArrowRight, IndianRupee, MapPin, Calendar, GraduationCap } from 'lucide-react';
import { StatCard, Card, Badge } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Dashboard – College – CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    const tenantId = user.tenantId!;

    // Fetch college data scoped to this tenant using TPO-accessible endpoints
    const [tenantRes, companiesRes, drivesRes, studentsRes] = await Promise.all([
        api.tenants.getById(token, tenantId).catch(() => ({ data: {} })) as Promise<{ data: Record<string, unknown> }>,
        api.companies.list(token, `tenantId=${tenantId}&limit=100`).catch(() => ({ data: [], total: 0 })) as Promise<{ data: unknown[]; total: number }>,
        api.drives.list(token, `tenantId=${tenantId}&limit=100`).catch(() => ({ data: [], total: 0 })) as Promise<{ data: unknown[]; total: number }>,
        api.students.list(token, `tenantId=${tenantId}&limit=500`).catch(() => ({ data: [], total: 0 })) as Promise<{ data: any[]; total: number }>,
    ]);

    const totalStudents = Number(studentsRes.total ?? (studentsRes.data || []).length);
    const totalCompanies = companiesRes.total || 0;
    const totalDrives = drivesRes.total || 0;
    const totalPlacements = (studentsRes.data || []).filter((s: any) => s.isPlaced === true).length;
    const placementRate = totalStudents > 0 ? Math.round((totalPlacements / totalStudents) * 100) : 0;

    // Build company name lookup
    const companyMap = new Map<string, string>();
    for (const c of (companiesRes.data || []) as any[]) {
        companyMap.set(c.$id || c.id, c.name || c.companyName || '');
    }

    // Active drives (most recent 5) with resolved company names
    const recentDrives = ((drivesRes.data || []) as any[]).slice(0, 5).map((d: any) => {
        const companyRef = d.companies;
        const companyId = Array.isArray(companyRef)
            ? (companyRef[0]?.$id || companyRef[0] || '')
            : (companyRef?.$id || companyRef || '');
        const companyName = Array.isArray(companyRef)
            ? (companyRef[0]?.name || companyMap.get(companyId) || '')
            : (companyRef?.name || companyMap.get(companyId) || '');
        return {
            id: d.$id || d.id || '',
            title: d.title || 'Untitled Drive',
            company: companyName || 'Unknown Company',
            salary: d.salary ?? 0,
            ctcPeriod: d.ctcPeriod || 'annual',
            location: d.location || '',
            jobType: d.jobType || '',
            jobLevel: d.jobLevel || '',
            vacancies: d.vacancies ?? 0,
            department: Array.isArray(d.department) ? d.department : (d.department ? [d.department] : []),
            deadline: d.deadline || '',
            studyingYear: d.studyingYear || '',
        };
    });

    return json({
        college: tenantRes.data,
        totalStudents,
        totalCompanies,
        totalDrives,
        totalPlacements,
        placementRate,
        recentDrives,
    });
}

export default function CollegeDashboardIndex() {
    const {
        college, totalStudents, totalCompanies, totalDrives,
        totalPlacements, placementRate, recentDrives,
    } = useLoaderData<typeof loader>() as any;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-surface-900">
                    {college?.collegeName ? `${college.collegeName} Dashboard` : 'College Dashboard'}
                </h1>
                <p className="text-surface-500 mt-1">Placement overview and quick actions</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Students" value={String(totalStudents)} icon={<Users size={24} />} subtitle="Registered students" />
                <StatCard title="Companies" value={String(totalCompanies)} icon={<Building2 size={24} />} subtitle="Registered companies" />
                <StatCard title="Drives" value={String(totalDrives)} icon={<Briefcase size={24} />} subtitle="Placement drives" />
                <StatCard title="Placement Rate" value={`${placementRate}%`} icon={<TrendingUp size={24} />} subtitle={`${totalPlacements} placed`} />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Link to="/companies" className="group">
                    <Card hover>
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                <Building2 size={22} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-surface-900 text-sm">Companies</h3>
                                <p className="text-xs text-surface-500">Manage & onboard</p>
                            </div>
                            <ArrowRight size={16} className="text-surface-300 group-hover:text-primary-500 transition-colors" />
                        </div>
                    </Card>
                </Link>
                <Link to="/drives" className="group">
                    <Card hover>
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                                <Briefcase size={22} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-surface-900 text-sm">Create Drive</h3>
                                <p className="text-xs text-surface-500">New placement drive</p>
                            </div>
                            <ArrowRight size={16} className="text-surface-300 group-hover:text-primary-500 transition-colors" />
                        </div>
                    </Card>
                </Link>
                <Link to="/announcements" className="group">
                    <Card hover>
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                                <Megaphone size={22} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-surface-900 text-sm">Announce</h3>
                                <p className="text-xs text-surface-500">Post updates</p>
                            </div>
                            <ArrowRight size={16} className="text-surface-300 group-hover:text-primary-500 transition-colors" />
                        </div>
                    </Card>
                </Link>
                <Link to="/analytics" className="group">
                    <Card hover>
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                                <BarChart3 size={22} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-surface-900 text-sm">Analytics</h3>
                                <p className="text-xs text-surface-500">View statistics</p>
                            </div>
                            <ArrowRight size={16} className="text-surface-300 group-hover:text-primary-500 transition-colors" />
                        </div>
                    </Card>
                </Link>
            </div>

            {/* Recent Drives */}
            <Card>
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-surface-900">Recent Drives</h3>
                    <Link to="/drives" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                        View all <ArrowRight size={14} />
                    </Link>
                </div>
                {recentDrives.length > 0 ? (
                    <div className="space-y-3">
                        {recentDrives.map((drive: any) => (
                            <div key={drive.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-surface-50 transition-colors border border-surface-100">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                    {drive.company.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-surface-900 text-sm truncate">{drive.title}</p>
                                    <p className="text-xs text-surface-500 mt-0.5">{drive.company}</p>
                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                        <span className="flex items-center gap-1 text-xs text-surface-500">
                                            <IndianRupee size={11} />
                                            {drive.ctcPeriod === 'monthly'
                                                ? `₹${drive.salary.toLocaleString('en-IN')}/mo`
                                                : drive.salary >= 100000
                                                    ? `₹${(drive.salary / 100000).toFixed(1)} LPA`
                                                    : `₹${drive.salary.toLocaleString('en-IN')}`
                                            }
                                        </span>
                                        {drive.location && (
                                            <span className="flex items-center gap-1 text-xs text-surface-500">
                                                <MapPin size={11} /> {drive.location}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1 text-xs text-surface-500">
                                            <Users size={11} /> {drive.vacancies} {drive.vacancies === 1 ? 'vacancy' : 'vacancies'}
                                        </span>
                                        {drive.deadline && (
                                            <span className="flex items-center gap-1 text-xs text-surface-500">
                                                <Calendar size={11} /> {new Date(drive.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <Badge variant="bg-primary-50 text-primary-700">
                                        {({'full-time':'Full Time','part-time':'Part Time','internship':'Internship','contract':'Contract','freelance':'Freelance'} as Record<string,string>)[drive.jobType] || drive.jobType}
                                    </Badge>
                                    <div className="flex gap-1 flex-wrap justify-end">
                                        {drive.department.slice(0, 3).map((d: string) => (
                                            <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-surface-500 font-medium">{d}</span>
                                        ))}
                                        {drive.department.length > 3 && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-surface-500">+{drive.department.length - 3}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <Briefcase size={32} className="mx-auto text-surface-300 mb-2" />
                        <p className="text-sm text-surface-400">No placement drives yet</p>
                        <Link to="/drives" className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block">
                            Create your first drive →
                        </Link>
                    </div>
                )}
            </Card>
        </div>
    );
}
