import {
    FileText,
    Download,
    Building2,
    Users,
    Briefcase,
    GraduationCap,
    BarChart3,
    Calendar,
} from 'lucide-react';
import { Card, Button, StatCard } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Reports – Super Admin – CareerNest' }];

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
                totalTenants: 0, totalUsers: 0, totalStudents: 0, totalCompanies: 0,
                totalDrives: 0, totalApplications: 0, totalPlacements: 0, placementRate: 0,
            },
            tenantStats: [],
        });
    }
}

export default function AdminReports() {
    const { stats, tenantStats } = useLoaderData<typeof loader>() as any;

    const reportTypes = [
        {
            title: 'Platform Summary',
            description: 'Overall platform statistics including colleges, users, placements',
            icon: BarChart3,
            color: 'text-primary-600 bg-primary-50',
            data: [
                { label: 'Total Colleges', value: stats.totalTenants },
                { label: 'Total Users', value: stats.totalUsers },
                { label: 'Total Students', value: stats.totalStudents },
                { label: 'Total Companies', value: stats.totalCompanies },
                { label: 'Total Drives', value: stats.totalDrives },
                { label: 'Total Applications', value: stats.totalApplications },
                { label: 'Total Placements', value: stats.totalPlacements },
                { label: 'Placement Rate', value: `${stats.placementRate}%` },
            ],
        },
        {
            title: 'College Performance',
            description: 'Detailed breakdown of each college\'s performance metrics',
            icon: Building2,
            color: 'text-violet-600 bg-violet-50',
            data: tenantStats.map((t: TenantStat) => ({
                label: t.tenantName,
                value: `${t.totalPlacements} placements, ${t.totalStudents} students`,
            })),
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-surface-900">Reports</h1>
                <p className="text-surface-500 mt-1">
                    Generate and view platform reports
                </p>
            </div>

            {/* Report Cards */}
            <div className="space-y-6">
                {reportTypes.map((report) => {
                    const Icon = report.icon;
                    return (
                        <Card key={report.title}>
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl ${report.color} flex items-center justify-center`}>
                                            <Icon size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-surface-900">
                                                {report.title}
                                            </h3>
                                            <p className="text-sm text-surface-400">
                                                {report.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-surface-400">
                                        <Calendar size={12} />
                                        <span>Generated: {new Date().toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-surface-100">
                                                <th className="text-left py-2 px-4 text-xs font-semibold text-surface-500 uppercase">
                                                    Metric
                                                </th>
                                                <th className="text-right py-2 px-4 text-xs font-semibold text-surface-500 uppercase">
                                                    Value
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.data.map((item: any, index: number) => (
                                                <tr
                                                    key={index}
                                                    className="border-b border-surface-50"
                                                >
                                                    <td className="py-2.5 px-4 text-sm text-surface-600">
                                                        {item.label}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-sm font-medium text-surface-900 text-right">
                                                        {item.value}
                                                    </td>
                                                </tr>
                                            ))}
                                            {report.data.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={2}
                                                        className="py-6 text-sm text-surface-400 text-center"
                                                    >
                                                        No data available
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
