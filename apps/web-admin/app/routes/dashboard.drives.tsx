import {
    GraduationCap,
    Search,
    Building2,
    Calendar,
    DollarSign,
    Users,
} from 'lucide-react';
import { Card } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useSearchParams, Link } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';
import { formatCurrency } from '@careernest/ui';

export const meta: MetaFunction = () => [{ title: 'Drives – Super Admin – CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || '1';
    const status = url.searchParams.get('status') || '';
    const tenantId = url.searchParams.get('tenantId') || '';

    try {
        const params = new URLSearchParams({ page, limit: '20' });
        if (status) params.set('status', status);
        if (tenantId) params.set('tenantId', tenantId);

        const [drivesRes, tenantsRes] = await Promise.all([
            api.admin.listDrives(token, params.toString()) as Promise<{
                data: Array<Record<string, unknown>>;
                total: number;
            }>,
            api.tenants.list(token, 'limit=100') as Promise<{
                data: Array<Record<string, unknown>>;
            }>,
        ]);

        return json({
            drives: drivesRes.data || [],
            total: drivesRes.total || 0,
            page: parseInt(page),
            limit: 20,
            tenants: tenantsRes.data || [],
            filters: { status, tenantId },
        });
    } catch {
        return json({
            drives: [],
            total: 0,
            page: 1,
            limit: 20,
            tenants: [],
            filters: { status, tenantId },
        });
    }
}

const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    draft: 'bg-amber-100 text-amber-700',
    closed: 'bg-surface-100 text-surface-500',
};

export default function AdminDrives() {
    const { drives, total, page, limit, tenants, filters } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();
    const totalPages = Math.ceil(total / limit);

    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value) params.set(key, value);
        else params.delete(key);
        params.delete('page');
        setSearchParams(params);
    };

    const getTenantName = (tenantId: string) => {
        const t = tenants.find((t: Record<string, unknown>) => t.$id === tenantId);
        return t ? (t.name as string) : tenantId;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-surface-900">Drive Monitoring</h1>
                <p className="text-surface-500 mt-1">
                    {total} drive{total !== 1 ? 's' : ''} across all colleges
                </p>
            </div>

            {/* Filters */}
            <Card>
                <div className="p-4 flex flex-wrap items-center gap-4">
                    <select
                        className="form-input w-36"
                        value={filters.status}
                        onChange={(e) => updateFilter('status', e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="closed">Closed</option>
                    </select>
                    <select
                        className="form-input w-48"
                        value={filters.tenantId}
                        onChange={(e) => updateFilter('tenantId', e.target.value)}
                    >
                        <option value="">All Colleges</option>
                        {tenants.map((t: Record<string, unknown>) => (
                            <option key={t.$id as string} value={t.$id as string}>
                                {t.name as string}
                            </option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* Drives Table */}
            {drives.length > 0 ? (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-surface-100">
                                    <th className="text-left py-3 px-5 text-xs font-semibold text-surface-500 uppercase">Job Role</th>
                                    <th className="text-left py-3 px-5 text-xs font-semibold text-surface-500 uppercase">College</th>
                                    <th className="text-left py-3 px-5 text-xs font-semibold text-surface-500 uppercase">CTC</th>
                                    <th className="text-left py-3 px-5 text-xs font-semibold text-surface-500 uppercase">Deadline</th>
                                    <th className="text-left py-3 px-5 text-xs font-semibold text-surface-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drives.map((drive: Record<string, unknown>) => (
                                    <tr
                                        key={drive.$id as string}
                                        className="border-b border-surface-50 hover:bg-surface-50 transition-colors"
                                    >
                                        <td className="py-3 px-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
                                                    <GraduationCap size={16} className="text-primary-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-surface-800">
                                                        {drive.jobRole as string}
                                                    </p>
                                                    <p className="text-xs text-surface-400">
                                                        ID: {(drive.$id as string)?.slice(0, 8)}...
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-5 text-sm text-surface-500">
                                            <Link
                                                to={`/dashboard/tenants/${drive.tenantId}`}
                                                className="text-primary-600 hover:text-primary-700"
                                            >
                                                {getTenantName(drive.tenantId as string)}
                                            </Link>
                                        </td>
                                        <td className="py-3 px-5 text-sm font-medium text-surface-800">
                                            {drive.CTC ? formatCurrency(drive.CTC as number) : 'N/A'}
                                        </td>
                                        <td className="py-3 px-5 text-sm text-surface-500">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {drive.deadline
                                                    ? new Date(drive.deadline as string).toLocaleDateString()
                                                    : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-5">
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[(drive.status as string) || ''] || 'bg-surface-100 text-surface-500'}`}>
                                                {drive.status as string}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between p-4 border-t border-surface-100">
                            <p className="text-sm text-surface-400">
                                Page {page} of {totalPages} ({total} total)
                            </p>
                            <div className="flex items-center gap-2">
                                {page > 1 && (
                                    <Link
                                        to={`?page=${page - 1}&${new URLSearchParams(filters as Record<string, string>).toString()}`}
                                        className="px-3 py-1.5 text-sm rounded-lg border border-surface-200 hover:bg-surface-50"
                                    >
                                        Previous
                                    </Link>
                                )}
                                {page < totalPages && (
                                    <Link
                                        to={`?page=${page + 1}&${new URLSearchParams(filters as Record<string, string>).toString()}`}
                                        className="px-3 py-1.5 text-sm rounded-lg border border-surface-200 hover:bg-surface-50"
                                    >
                                        Next
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            ) : (
                <Card>
                    <div className="text-center py-16">
                        <GraduationCap size={48} className="mx-auto text-surface-300 mb-4" />
                        <h3 className="text-lg font-semibold text-surface-700 mb-2">No drives found</h3>
                        <p className="text-surface-400 text-sm">
                            {Object.values(filters).some(Boolean)
                                ? 'Try adjusting your filters'
                                : 'No placement drives have been created yet'}
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}
