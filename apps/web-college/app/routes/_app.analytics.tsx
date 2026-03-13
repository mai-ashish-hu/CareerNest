import { BarChart3, TrendingUp, Users, Building2, IndianRupee, Award, Briefcase } from 'lucide-react';
import { StatCard, Card, Badge, Avatar, EmptyState } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Analytics – College – CareerNest' }];

type DepartmentStat = {
    dept: string;
    total: number;
    placed: number;
    percentage: number;
    avgCTC: number;
    highestCTC: number;
};

type RecruiterStat = {
    company: string;
    hired: number;
    avgCTC: number;
};

type DriveConversionStat = {
    company: string;
    applied: number;
    shortlisted: number;
    selected: number;
    rate: number;
};

type LoaderData = {
    totalStudents: number;
    totalCompanies: number;
    totalPlacements: number;
    placementRate: string;
    deptStats: DepartmentStat[];
    topRecruiters: RecruiterStat[];
    driveConversion: DriveConversionStat[];
    highestCTC: number;
    avgCTC: number;
    medianCTC: number;
    lowestCTC: number;
};

function formatCTC(n: number): string {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    return `₹${n.toLocaleString('en-IN')}`;
}

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) throw redirect('/login');
    const tenantId = user.tenantId;

    const [studentsRes, companiesRes, drivesRes, analyticsRes, coursesRes] = await Promise.all([
        api.students.list(token, `tenantId=${tenantId}&limit=500`).catch(() => ({ data: [], total: 0 })) as Promise<{ data: any[]; total: number }>,
        api.companies.list(token, `tenantId=${tenantId}&limit=500`).catch(() => ({ data: [], total: 0 })) as Promise<{ data: any[]; total: number }>,
        api.drives.list(token, `tenantId=${tenantId}&limit=500`).catch(() => ({ data: [], total: 0 })) as Promise<{ data: any[]; total: number }>,
        api.analytics.placement(token).catch(() => ({ data: null })) as Promise<{ data: any }>,
        api.courses.list(token, `tenantId=${tenantId}&limit=500`).catch(() => ({ data: [], total: 0 })) as Promise<{ data: any[]; total: number }>,
    ]);

    const analytics = analyticsRes.data || {};
    const totalStudents = analytics.totalStudents || studentsRes.total || 0;
    const totalCompanies = companiesRes.total || 0;
    const totalPlacements = analytics.placedStudents || 0;
    const placementRate = analytics.placementPercentage
        ? String(analytics.placementPercentage)
        : (totalStudents > 0 ? ((totalPlacements / totalStudents) * 100).toFixed(1) : '0.0');

    // Build per-department CTC stats from drives
    const deptCTCMap = new Map<string, number[]>();
    for (const d of (drivesRes.data || [])) {
        const salary = d.salary ?? 0;
        if (salary <= 0) continue;
        const depts: string[] = Array.isArray(d.department) ? d.department : (d.department ? [d.department] : []);
        for (const dept of depts) {
            if (!deptCTCMap.has(dept)) deptCTCMap.set(dept, []);
            deptCTCMap.get(dept)!.push(salary);
        }
    }

    // Department-wise stats from analytics endpoint (or fallback from students)
    const students = studentsRes.data || [];
    let deptStats: DepartmentStat[] = [];
    if (analytics.departmentStats && analytics.departmentStats.length > 0) {
        deptStats = analytics.departmentStats.map((d: any): DepartmentStat => {
            const ctcs = deptCTCMap.get(d.department) || [];
            return {
                dept: d.department,
                total: d.total,
                placed: d.placed,
                percentage: d.percentage,
                avgCTC: ctcs.length > 0 ? Math.round(ctcs.reduce((a: number, c: number) => a + c, 0) / ctcs.length) : 0,
                highestCTC: ctcs.length > 0 ? Math.max(...ctcs) : 0,
            };
        });
    } else {
        // Fallback: build from student data
        const deptMap = new Map<string, { total: number; placed: number }>();
        for (const s of students) {
            const dept = s.department || s.course || 'Other';
            if (!deptMap.has(dept)) deptMap.set(dept, { total: 0, placed: 0 });
            const d = deptMap.get(dept)!;
            d.total++;
            if (s.isPlaced === true) d.placed++;
        }
        deptStats = Array.from(deptMap.entries()).map(([dept, d]): DepartmentStat => {
            const ctcs = deptCTCMap.get(dept) || [];
            return {
                dept,
                total: d.total,
                placed: d.placed,
                percentage: d.total > 0 ? Math.round((d.placed / d.total) * 100 * 10) / 10 : 0,
                avgCTC: ctcs.length > 0 ? Math.round(ctcs.reduce((a: number, c: number) => a + c, 0) / ctcs.length) : 0,
                highestCTC: ctcs.length > 0 ? Math.max(...ctcs) : 0,
            };
        });
    }
    deptStats.sort((a, b) => b.percentage - a.percentage);

    // Top recruiters from drive conversion data
    const companyDriveMap = new Map<string, number[]>();
    for (const d of (drivesRes.data || [])) {
        const companyRef = d.companies;
        const companyName = Array.isArray(companyRef)
            ? (companyRef[0]?.name || '')
            : (companyRef?.name || d.companyName || '');
        if (!companyName) continue;
        const salary = d.salary ?? 0;
        if (salary > 0) {
            if (!companyDriveMap.has(companyName)) companyDriveMap.set(companyName, []);
            companyDriveMap.get(companyName)!.push(salary);
        }
    }

    const topRecruiters: RecruiterStat[] = (analytics.driveConversion || [])
        .filter((d: any) => d.selected > 0)
        .map((d: any): RecruiterStat => {
            const ctcs = companyDriveMap.get(d.company) || [];
            return { company: d.company, hired: d.selected, avgCTC: ctcs.length > 0 ? Math.round(ctcs.reduce((a: number, c: number) => a + c, 0) / ctcs.length) : 0 };
        })
        .sort((a: any, b: any) => b.hired - a.hired)
        .slice(0, 6);

    // Drive conversion from analytics or drives data
    let driveConversion: DriveConversionStat[] = [];
    if (analytics.driveConversion && analytics.driveConversion.length > 0) {
        driveConversion = analytics.driveConversion
            .filter((d: any) => d.applied > 0)
            .map((d: any): DriveConversionStat => ({
                company: d.company,
                applied: d.applied,
                shortlisted: 0,
                selected: d.selected,
                rate: d.rate,
            }))
            .sort((a: any, b: any) => b.rate - a.rate)
            .slice(0, 5);
    } else {
        driveConversion = (drivesRes.data || [])
            .filter((d: any) => d.status === 'closed' || d.status === 'active')
            .map((d: any): DriveConversionStat => ({
                company: d.companyName || '',
                applied: d.applied ?? d.totalApplications ?? 0,
                shortlisted: d.shortlisted ?? 0,
                selected: d.selected ?? 0,
                rate: (d.applied ?? d.totalApplications ?? 0) > 0
                    ? Math.round(((d.selected ?? 0) / (d.applied ?? d.totalApplications ?? 1)) * 100 * 10) / 10
                    : 0,
            }))
            .filter((d: any) => d.applied > 0)
            .sort((a: any, b: any) => b.rate - a.rate)
            .slice(0, 5);
    }

    // CTC overview from drives data (using salary field)
    const allCTCs = (drivesRes.data || [])
        .map((d: any) => d.salary ?? d.ctc ?? d.CTC ?? 0)
        .filter((c: number) => c > 0)
        .sort((a: number, b: number) => a - b);
    const highestCTC = allCTCs.length > 0 ? allCTCs[allCTCs.length - 1] : 0;
    const lowestCTC = allCTCs.length > 0 ? allCTCs[0] : 0;
    const avgCTC = allCTCs.length > 0 ? Math.round(allCTCs.reduce((a: number, c: number) => a + c, 0) / allCTCs.length) : 0;
    const medianCTC = allCTCs.length > 0 ? allCTCs[Math.floor(allCTCs.length / 2)] : 0;

    return json<LoaderData>({
        totalStudents, totalCompanies, totalPlacements, placementRate,
        deptStats, topRecruiters, driveConversion,
        highestCTC, avgCTC, medianCTC, lowestCTC,
    });
}

export default function Analytics() {
    const {
        totalStudents, totalCompanies, totalPlacements, placementRate,
        deptStats, topRecruiters, driveConversion,
        highestCTC, avgCTC, medianCTC, lowestCTC,
    } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-surface-900">Placement Analytics</h1>
                <p className="text-surface-500 mt-1">Comprehensive placement statistics and insights</p>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Placement Rate" value={`${placementRate}%`} icon={<TrendingUp size={24} />} subtitle={`${totalPlacements} of ${totalStudents} students`} />
                <StatCard title="Total Offers" value={String(totalPlacements)} icon={<Award size={24} />} subtitle="Across all companies" />
                <StatCard title="Highest CTC" value={formatCTC(highestCTC)} icon={<IndianRupee size={24} />} subtitle="Best offer" />
                <StatCard title="Active Companies" value={String(totalCompanies)} icon={<Building2 size={24} />} subtitle="Registered companies" />
            </div>

            {/* Department-wise Placement */}
            <Card>
                <h3 className="font-semibold text-surface-900 mb-6 flex items-center gap-2">
                    <BarChart3 size={20} className="text-primary-600" /> Department-wise Placement
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-surface-100">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Department</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-surface-500 uppercase">Total</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-surface-500 uppercase">Placed</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Rate</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-surface-500 uppercase">Avg CTC</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-surface-500 uppercase">Highest CTC</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-50">
                            {deptStats.map((dept) => (
                                <tr key={dept.dept} className="hover:bg-surface-50/50 transition-colors">
                                    <td className="px-4 py-4">
                                        <Badge variant="bg-primary-50 text-primary-700">{dept.dept}</Badge>
                                    </td>
                                    <td className="px-4 py-4 text-center text-sm font-medium text-surface-700">{dept.total}</td>
                                    <td className="px-4 py-4 text-center text-sm font-semibold text-emerald-600">{dept.placed}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 max-w-[120px]">
                                                <div className="w-full bg-surface-100 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${
                                                            dept.percentage >= 75 ? 'bg-emerald-500' :
                                                            dept.percentage >= 50 ? 'bg-amber-500' :
                                                            'bg-rose-500'
                                                        }`}
                                                        style={{ width: `${dept.percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-sm font-semibold text-surface-700 w-14 text-right">{dept.percentage}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center text-sm text-surface-700">{formatCTC(dept.avgCTC)}</td>
                                    <td className="px-4 py-4 text-center text-sm font-semibold text-surface-700">{formatCTC(dept.highestCTC)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Recruiters */}
                <Card>
                    <h3 className="font-semibold text-surface-900 mb-5 flex items-center gap-2">
                        <Building2 size={20} className="text-primary-600" /> Top Recruiters
                    </h3>
                    <div className="space-y-3">
                        {topRecruiters.map((recruiter, idx) => (
                            <div key={recruiter.company} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-50 transition-colors">
                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                                    idx === 0 ? 'bg-amber-100 text-amber-700' :
                                    idx === 1 ? 'bg-surface-200 text-surface-600' :
                                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                                    'bg-surface-50 text-surface-400'
                                }`}>
                                    {idx + 1}
                                </span>
                                <Avatar name={recruiter.company} size="sm" />
                                <div className="flex-1">
                                    <p className="font-medium text-surface-900 text-sm">{recruiter.company}</p>
                                    <p className="text-xs text-surface-400">Avg CTC: {formatCTC(recruiter.avgCTC)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-primary-600">{recruiter.hired}</p>
                                    <p className="text-xs text-surface-400">hired</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Drive Conversion Rates */}
                <Card>
                    <h3 className="font-semibold text-surface-900 mb-5 flex items-center gap-2">
                        <Briefcase size={20} className="text-primary-600" /> Drive Conversion
                    </h3>
                    <div className="space-y-4">
                        {driveConversion.map((drive) => (
                            <div key={drive.company} className="p-3 rounded-xl bg-surface-50">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-surface-900 text-sm">{drive.company}</span>
                                    <span className={`text-sm font-bold ${drive.rate >= 25 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {drive.rate}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-0 h-2 rounded-full overflow-hidden bg-surface-100">
                                            {drive.applied > 0 && (
                                                <>
                                                    <div className="h-full bg-emerald-500" style={{ width: `${(drive.selected / drive.applied) * 100}%` }} />
                                                    <div className="h-full bg-amber-400" style={{ width: `${((drive.shortlisted - drive.selected) / drive.applied) * 100}%` }} />
                                                    <div className="h-full bg-blue-300" style={{ width: `${((drive.applied - drive.shortlisted) / drive.applied) * 100}%` }} />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-xs text-surface-500">
                                    <span><span className="font-medium text-blue-600">{drive.applied}</span> Applied</span>
                                    <span><span className="font-medium text-amber-600">{drive.shortlisted}</span> Shortlisted</span>
                                    <span><span className="font-medium text-emerald-600">{drive.selected}</span> Selected</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* CTC Distribution */}
            <Card>
                <h3 className="font-semibold text-surface-900 mb-5 flex items-center gap-2">
                    <IndianRupee size={20} className="text-primary-600" /> CTC Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 rounded-xl bg-surface-50">
                        <p className="text-xs text-surface-500 uppercase font-medium mb-1">Highest</p>
                        <p className="text-2xl font-bold text-surface-900">{formatCTC(highestCTC)}</p>
                        <p className="text-xs text-surface-400 mt-1">Best offer</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-surface-50">
                        <p className="text-xs text-surface-500 uppercase font-medium mb-1">Average</p>
                        <p className="text-2xl font-bold text-surface-900">{formatCTC(avgCTC)}</p>
                        <p className="text-xs text-surface-400 mt-1">Across all offers</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-surface-50">
                        <p className="text-xs text-surface-500 uppercase font-medium mb-1">Median</p>
                        <p className="text-2xl font-bold text-surface-900">{formatCTC(medianCTC)}</p>
                        <p className="text-xs text-surface-400 mt-1">Mid-range offers</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-surface-50">
                        <p className="text-xs text-surface-500 uppercase font-medium mb-1">Lowest</p>
                        <p className="text-2xl font-bold text-surface-900">{formatCTC(lowestCTC)}</p>
                        <p className="text-xs text-surface-400 mt-1">Entry-level roles</p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
