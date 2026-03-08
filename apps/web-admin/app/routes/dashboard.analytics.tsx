import {
    BarChart3,
    TrendingUp,
    Building2,
    Users,
    GraduationCap,
    Briefcase,
    Award,
    ArrowUpRight,
    ArrowDownRight,
    Target,
} from 'lucide-react';
import { Card, StatCard } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Analytics – Super Admin – CareerNest' }];

interface TenantStat {
    tenantId: string;
    tenantName: string;
    collegeId: string;
    totalUsers: number;
    totalStudents: number;
    totalCompanies: number;
    totalDrives: number;
    totalPlacements: number;
}

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);

    try {
        const [statsRes, tenantStatsRes] = await Promise.all([
            api.admin.stats(token) as Promise<{ data: Record<string, number> }>,
            api.admin.tenantWiseStats(token) as Promise<{ data: TenantStat[] }>,
        ]);

        return json({
            stats: statsRes.data,
            tenantStats: tenantStatsRes.data || [],
        });
    } catch {
        return json({
            stats: {
                totalTenants: 0, activeTenants: 0, totalUsers: 0,
                totalStudents: 0, placedStudents: 0, totalCompanies: 0,
                totalDrives: 0, activeDrives: 0, totalApplications: 0,
                totalPlacements: 0, placementRate: 0,
            },
            tenantStats: [],
        });
    }
}

export default function AdminAnalytics() {
    const { stats, tenantStats } = useLoaderData<typeof loader>() as any;

    // Sort tenants by placements (highest first)
    const sortedTenants = [...tenantStats].sort(
        (a: TenantStat, b: TenantStat) => b.totalPlacements - a.totalPlacements
    );

    // Find best performing college
    const bestCollege = sortedTenants[0];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-surface-900">
                    Platform Analytics
                </h1>
                <p className="text-surface-500 mt-1">
                    Comprehensive metrics across all colleges
                </p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    title="Colleges"
                    value={String(stats.totalTenants)}
                    subtitle={`${stats.activeTenants} active`}
                    icon={<Building2 size={22} />}
                />
                <StatCard
                    title="Users"
                    value={String(stats.totalUsers)}
                    subtitle="Total registered"
                    icon={<Users size={22} />}
                />
                <StatCard
                    title="Students"
                    value={String(stats.totalStudents)}
                    subtitle={`${stats.placedStudents} placed`}
                    icon={<GraduationCap size={22} />}
                />
                <StatCard
                    title="Companies"
                    value={String(stats.totalCompanies)}
                    subtitle="Hiring partners"
                    icon={<Briefcase size={22} />}
                />
                <StatCard
                    title="Placement Rate"
                    value={`${stats.placementRate}%`}
                    subtitle={`${stats.totalPlacements} placed`}
                    icon={<TrendingUp size={22} />}
                />
            </div>

            {/* Placement Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Drives Summary */}
                <Card>
                    <div className="p-6">
                        <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
                            <Target size={18} className="text-primary-600" />
                            Drive Overview
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-surface-500">Total Drives</span>
                                <span className="text-lg font-bold text-surface-900">{stats.totalDrives}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-surface-500">Active Drives</span>
                                <span className="text-lg font-bold text-emerald-600">{stats.activeDrives}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-surface-500">Applications</span>
                                <span className="text-lg font-bold text-surface-900">{stats.totalApplications}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-surface-500">Conversion Rate</span>
                                <span className="text-lg font-bold text-primary-600">
                                    {stats.totalApplications > 0
                                        ? `${Math.round((stats.totalPlacements / stats.totalApplications) * 100)}%`
                                        : '0%'}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Placement Health */}
                <Card>
                    <div className="p-6">
                        <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
                            <Award size={18} className="text-amber-600" />
                            Placement Health
                        </h3>
                        <div className="flex items-center justify-center py-4">
                            <div className="relative w-36 h-36">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="50"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="10"
                                        className="text-surface-100"
                                    />
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="50"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="10"
                                        strokeDasharray={`${(stats.placementRate / 100) * 314} 314`}
                                        strokeLinecap="round"
                                        className="text-primary-500"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <span className="text-2xl font-bold text-surface-900">
                                        {stats.placementRate}%
                                    </span>
                                    <span className="text-xs text-surface-400">Placed</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-center text-sm text-surface-500">
                            {stats.placedStudents} out of {stats.totalStudents} students
                        </div>
                    </div>
                </Card>

                {/* Best Performing College */}
                <Card>
                    <div className="p-6">
                        <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
                            <ArrowUpRight size={18} className="text-emerald-600" />
                            Top College
                        </h3>
                        {bestCollege ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                                        {bestCollege.tenantName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-surface-900">
                                            {bestCollege.tenantName}
                                        </p>
                                        <p className="text-xs text-surface-400">
                                            {bestCollege.totalPlacements} placements
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-surface-50 rounded-xl text-center">
                                        <p className="text-lg font-bold text-surface-900">{bestCollege.totalStudents}</p>
                                        <p className="text-xs text-surface-400">Students</p>
                                    </div>
                                    <div className="p-3 bg-surface-50 rounded-xl text-center">
                                        <p className="text-lg font-bold text-surface-900">{bestCollege.totalCompanies}</p>
                                        <p className="text-xs text-surface-400">Companies</p>
                                    </div>
                                    <div className="p-3 bg-surface-50 rounded-xl text-center">
                                        <p className="text-lg font-bold text-surface-900">{bestCollege.totalDrives}</p>
                                        <p className="text-xs text-surface-400">Drives</p>
                                    </div>
                                    <div className="p-3 bg-surface-50 rounded-xl text-center">
                                        <p className="text-lg font-bold text-surface-900">{bestCollege.totalUsers}</p>
                                        <p className="text-xs text-surface-400">Users</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-surface-400 text-center py-8">
                                No data available yet
                            </p>
                        )}
                    </div>
                </Card>
            </div>

            {/* College-wise Comparison Table */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-surface-900">
                            College-wise Performance
                        </h3>
                        <Link
                            to="/dashboard/tenants"
                            className="text-sm text-primary-600 hover:text-primary-700"
                        >
                            Manage colleges →
                        </Link>
                    </div>

                    {sortedTenants.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-surface-100">
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase">#</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase">College</th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-surface-500 uppercase">College ID</th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Users</th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Students</th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Companies</th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Drives</th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Placements</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedTenants.map((tenant: TenantStat, index: number) => (
                                        <tr key={tenant.tenantId} className="border-b border-surface-50 hover:bg-surface-50">
                                            <td className="py-3 px-4 text-sm text-surface-400 font-medium">{index + 1}</td>
                                            <td className="py-3 px-4">
                                                <Link
                                                    to={`/dashboard/tenants/${tenant.tenantId}`}
                                                    className="text-sm font-medium text-surface-800 hover:text-primary-600"
                                                >
                                                    {tenant.tenantName}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-primary-50 text-primary-700">
                                                    {tenant.collegeId}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center text-sm text-surface-600">{tenant.totalUsers}</td>
                                            <td className="py-3 px-4 text-center text-sm text-surface-600">{tenant.totalStudents}</td>
                                            <td className="py-3 px-4 text-center text-sm text-surface-600">{tenant.totalCompanies}</td>
                                            <td className="py-3 px-4 text-center text-sm text-surface-600">{tenant.totalDrives}</td>
                                            <td className="py-3 px-4 text-center text-sm font-semibold text-emerald-600">{tenant.totalPlacements}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-surface-400 text-center py-8">
                            No college data available yet
                        </p>
                    )}
                </div>
            </Card>
        </div>
    );
}
