import {
    ScrollText,
    Search,
    Filter,
    Activity,
    Shield,
    AlertTriangle,
    Clock,
    User,
    RefreshCw,
} from 'lucide-react';
import { Card } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useSearchParams, Form, Link } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Audit Logs – Super Admin – CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || '1';
    const action = url.searchParams.get('action') || '';
    const resourceType = url.searchParams.get('resourceType') || '';
    const tenantId = url.searchParams.get('tenantId') || '';

    try {
        const params = new URLSearchParams({ page, limit: '30' });
        if (action) params.set('action', action);
        if (resourceType) params.set('resourceType', resourceType);
        if (tenantId) params.set('tenantId', tenantId);

        const [logsRes, tenantsRes] = await Promise.all([
            api.admin.listAuditLogs(token, params.toString()) as Promise<{
                data: Array<Record<string, unknown>>;
                total: number;
            }>,
            api.tenants.list(token, 'limit=100') as Promise<{
                data: Array<Record<string, unknown>>;
            }>,
        ]);

        return json({
            logs: logsRes.data || [],
            total: logsRes.total || 0,
            page: parseInt(page),
            limit: 30,
            tenants: tenantsRes.data || [],
            filters: { action, resourceType, tenantId },
        });
    } catch {
        return json({
            logs: [],
            total: 0,
            page: 1,
            limit: 30,
            tenants: [],
            filters: { action, resourceType, tenantId },
        });
    }
}

const actionIcons: Record<string, { icon: typeof Activity; color: string }> = {
    LOGIN: { icon: Shield, color: 'text-emerald-500 bg-emerald-50' },
    LOGOUT: { icon: Shield, color: 'text-surface-400 bg-surface-100' },
    TENANT_CREATE: { icon: Activity, color: 'text-blue-500 bg-blue-50' },
    TENANT_UPDATE: { icon: Activity, color: 'text-blue-500 bg-blue-50' },
    USER_CREATE: { icon: User, color: 'text-violet-500 bg-violet-50' },
    USER_STATUS_UPDATE: { icon: AlertTriangle, color: 'text-amber-500 bg-amber-50' },
    COMPANY_CREATE: { icon: Activity, color: 'text-orange-500 bg-orange-50' },
    DRIVE_CREATE: { icon: Activity, color: 'text-indigo-500 bg-indigo-50' },
    DRIVE_UPDATE: { icon: Activity, color: 'text-indigo-500 bg-indigo-50' },
    APPLICATION_CREATE: { icon: Activity, color: 'text-cyan-500 bg-cyan-50' },
    STAGE_UPDATE: { icon: RefreshCw, color: 'text-teal-500 bg-teal-50' },
    STUDENT_UPDATE: { icon: User, color: 'text-pink-500 bg-pink-50' },
    ANNOUNCEMENT_CREATE: { icon: Activity, color: 'text-yellow-500 bg-yellow-50' },
};

export default function AdminAuditLogs() {
    const { logs, total, page, limit, tenants, filters } = useLoaderData<typeof loader>() as any;
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
        if (tenantId === 'global') return 'Global';
        const t = tenants.find((t: Record<string, unknown>) => t.$id === tenantId);
        return t ? (t.name as string) : tenantId;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-surface-900">Audit Logs</h1>
                <p className="text-surface-500 mt-1">
                    {total} log entr{total !== 1 ? 'ies' : 'y'} • Security & compliance monitoring
                </p>
            </div>

            {/* Filters */}
            <Card>
                <div className="p-4 flex flex-wrap items-center gap-4">
                    <select
                        className="form-input w-48"
                        value={filters.action}
                        onChange={(e) => updateFilter('action', e.target.value)}
                    >
                        <option value="">All Actions</option>
                        <option value="LOGIN">Login</option>
                        <option value="LOGOUT">Logout</option>
                        <option value="TENANT_CREATE">Tenant Create</option>
                        <option value="TENANT_UPDATE">Tenant Update</option>
                        <option value="USER_CREATE">User Create</option>
                        <option value="USER_STATUS_UPDATE">User Status Update</option>
                        <option value="COMPANY_CREATE">Company Create</option>
                        <option value="DRIVE_CREATE">Drive Create</option>
                        <option value="DRIVE_UPDATE">Drive Update</option>
                        <option value="APPLICATION_CREATE">Application Create</option>
                        <option value="STAGE_UPDATE">Stage Update</option>
                        <option value="STUDENT_UPDATE">Student Update</option>
                        <option value="ANNOUNCEMENT_CREATE">Announcement Create</option>
                    </select>
                    <select
                        className="form-input w-44"
                        value={filters.resourceType}
                        onChange={(e) => updateFilter('resourceType', e.target.value)}
                    >
                        <option value="">All Resources</option>
                        <option value="tenant">Tenant</option>
                        <option value="user">User</option>
                        <option value="company">Company</option>
                        <option value="drive">Drive</option>
                        <option value="application">Application</option>
                        <option value="student">Student</option>
                        <option value="announcement">Announcement</option>
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

            {/* Logs Timeline */}
            {logs.length > 0 ? (
                <Card>
                    <div className="divide-y divide-surface-50">
                        {logs.map((log: Record<string, unknown>) => {
                            const actionInfo = actionIcons[(log.action as string) || ''] || {
                                icon: Activity,
                                color: 'text-surface-400 bg-surface-100',
                            };
                            const IconComponent = actionInfo.icon;

                            let metadata: Record<string, unknown> = {};
                            try {
                                if (log.metadata) metadata = JSON.parse(log.metadata as string);
                            } catch {}

                            return (
                                <div
                                    key={log.$id as string}
                                    className="p-4 hover:bg-surface-50/50 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${actionInfo.color}`}>
                                            <IconComponent size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-surface-800">
                                                    {(log.action as string)?.replace(/_/g, ' ')}
                                                </p>
                                                <div className="flex items-center gap-1 text-xs text-surface-400">
                                                    <Clock size={12} />
                                                    <span>
                                                        {log.timestamp
                                                            ? new Date(log.timestamp as string).toLocaleString()
                                                            : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
                                                <span>
                                                    Resource: <span className="text-surface-600">{log.resourceType as string}</span>
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    College: <span className="text-surface-600">{getTenantName(log.tenantId as string)}</span>
                                                </span>
                                                {metadata.ip ? (
                                                    <>
                                                        <span>•</span>
                                                        <span>IP: {String(metadata.ip)}</span>
                                                    </>
                                                ) : null}
                                                {metadata.method ? (
                                                    <>
                                                        <span>•</span>
                                                        <span>
                                                            {String(metadata.method)} {String(metadata.path)}
                                                        </span>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
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
                        <ScrollText size={48} className="mx-auto text-surface-300 mb-4" />
                        <h3 className="text-lg font-semibold text-surface-700 mb-2">No audit logs</h3>
                        <p className="text-surface-400 text-sm">
                            {Object.values(filters).some(Boolean)
                                ? 'Try adjusting your filters'
                                : 'No activity has been logged yet'}
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}
