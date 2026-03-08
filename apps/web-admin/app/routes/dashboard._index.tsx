import {
    Shield,
    Building,
    Users,
    Activity,
    GraduationCap,
    Briefcase,
    TrendingUp,
    Award,
    ArrowUpRight,
    ArrowDownRight,
    FileText,
    Clock,
} from 'lucide-react';
import { StatCard, Card } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Dashboard – Super Admin – CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    try {
        const [statsRes, tenantsRes, auditRes] = await Promise.all([
            api.admin.stats(token) as Promise<{ success: boolean; data: Record<string, number> }>,
            api.tenants.list(token, 'limit=5') as Promise<{ success: boolean; data: Array<Record<string, unknown>>; total: number }>,
            api.admin.listAuditLogs(token, 'limit=8') as Promise<{ success: boolean; data: Array<Record<string, unknown>>; total: number }>,
        ]);
        return json({
            stats: statsRes.data,
            recentTenants: tenantsRes.data || [],
            recentLogs: auditRes.data || [],
        });
    } catch {
        return json({
            stats: {
                totalTenants: 0, activeTenants: 0, totalUsers: 0,
                totalStudents: 0, placedStudents: 0, totalCompanies: 0,
                totalDrives: 0, activeDrives: 0, totalApplications: 0,
                totalPlacements: 0, placementRate: 0,
            },
            recentTenants: [],
            recentLogs: [],
        });
    }
}

export default function AdminDashboardIndex() {
    const { stats, recentTenants, recentLogs } = useLoaderData<typeof loader>() as any;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-surface-900">
                    Super Admin Dashboard
                </h1>
                <p className="text-surface-500 mt-1">
                    Platform-wide overview and real-time monitoring
                </p>
            </div>

            {/* Primary Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Colleges"
                    value={String(stats.totalTenants)}
                    subtitle={`${stats.activeTenants} active`}
                    icon={<Building size={24} />}
                />
                <StatCard
                    title="Total Users"
                    value={String(stats.totalUsers)}
                    subtitle="Across all tenants"
                    icon={<Users size={24} />}
                />
                <StatCard
                    title="Active Drives"
                    value={String(stats.activeDrives)}
                    subtitle={`${stats.totalDrives} total`}
                    icon={<Briefcase size={24} />}
                />
                <StatCard
                    title="Placement Rate"
                    value={`${stats.placementRate}%`}
                    subtitle={`${stats.placedStudents} placed`}
                    icon={<TrendingUp size={24} />}
                />
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Students"
                    value={String(stats.totalStudents)}
                    subtitle="Registered students"
                    icon={<GraduationCap size={24} />}
                />
                <StatCard
                    title="Companies"
                    value={String(stats.totalCompanies)}
                    subtitle="Across all colleges"
                    icon={<Shield size={24} />}
                />
                <StatCard
                    title="Applications"
                    value={String(stats.totalApplications)}
                    subtitle="Total applications"
                    icon={<FileText size={24} />}
                />
                <StatCard
                    title="Placements"
                    value={String(stats.totalPlacements)}
                    subtitle="Successful placements"
                    icon={<Award size={24} />}
                />
            </div>

            {/* Bottom Section - Recent Activity & Tenants */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Tenants */}
                <Card>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-surface-900">
                                Recent Colleges
                            </h3>
                            <Link
                                to="/dashboard/tenants"
                                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                            >
                                View all <ArrowUpRight size={14} />
                            </Link>
                        </div>
                        {recentTenants.length > 0 ? (
                            <div className="space-y-3">
                                {recentTenants.map((tenant: Record<string, unknown>) => (
                                    <div
                                        key={tenant.$id as string}
                                        className="flex items-center justify-between p-3 rounded-xl bg-surface-50 hover:bg-surface-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
                                                <Building
                                                    size={16}
                                                    className="text-primary-600"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-surface-800">
                                                    {tenant.collegeName as string}
                                                </p>
                                                <p className="text-xs text-surface-400">
                                                    {tenant.collegeId as string}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700"
                                        >
                                            Active
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-surface-400 text-center py-6">
                                No colleges onboarded yet
                            </p>
                        )}
                    </div>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-surface-900">
                                Recent Activity
                            </h3>
                            <Link
                                to="/dashboard/audit-logs"
                                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                            >
                                View all <ArrowUpRight size={14} />
                            </Link>
                        </div>
                        {recentLogs.length > 0 ? (
                            <div className="space-y-3">
                                {recentLogs.map(
                                    (log: Record<string, unknown>) => (
                                        <div
                                            key={log.$id as string}
                                            className="flex items-start gap-3 p-3 rounded-xl bg-surface-50"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-surface-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Activity
                                                    size={14}
                                                    className="text-surface-500"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-surface-800 truncate">
                                                    {(log.action as string)?.replace(/_/g, ' ')}
                                                </p>
                                                <p className="text-xs text-surface-400">
                                                    {log.resourceType as string} •{' '}
                                                    {log.timestamp
                                                        ? new Date(
                                                              log.timestamp as string
                                                          ).toLocaleString()
                                                        : ''}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-surface-400 text-center py-6">
                                No activity recorded yet
                            </p>
                        )}
                    </div>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <div className="p-6">
                    <h3 className="font-semibold text-surface-900 mb-4">
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link
                            to="/dashboard/tenants?action=create"
                            className="flex items-center gap-3 p-4 rounded-xl border border-surface-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                                <Building size={18} className="text-primary-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-surface-800">
                                    Add College
                                </p>
                                <p className="text-xs text-surface-400">
                                    Onboard new tenant
                                </p>
                            </div>
                        </Link>

                        <Link
                            to="/dashboard/users"
                            className="flex items-center gap-3 p-4 rounded-xl border border-surface-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                <Users size={18} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-surface-800">
                                    Manage Users
                                </p>
                                <p className="text-xs text-surface-400">
                                    Cross-tenant oversight
                                </p>
                            </div>
                        </Link>

                        <Link
                            to="/dashboard/analytics"
                            className="flex items-center gap-3 p-4 rounded-xl border border-surface-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                                <TrendingUp
                                    size={18}
                                    className="text-violet-600"
                                />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-surface-800">
                                    View Analytics
                                </p>
                                <p className="text-xs text-surface-400">
                                    Platform metrics
                                </p>
                            </div>
                        </Link>

                        <Link
                            to="/dashboard/audit-logs"
                            className="flex items-center gap-3 p-4 rounded-xl border border-surface-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                                <Clock
                                    size={18}
                                    className="text-amber-600"
                                />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-surface-800">
                                    Audit Logs
                                </p>
                                <p className="text-xs text-surface-400">
                                    Security monitoring
                                </p>
                            </div>
                        </Link>
                    </div>
                </div>
            </Card>
        </div>
    );
}
