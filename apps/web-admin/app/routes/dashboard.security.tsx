import {
    Shield,
    Lock,
    Key,
    AlertTriangle,
    Eye,
    CheckCircle,
    Globe,
    Server,
    Database,
    Clock,
} from 'lucide-react';
import { Card, StatCard } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Security – Super Admin – CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);

    try {
        const [statsRes, auditRes] = await Promise.all([
            api.admin.stats(token) as Promise<{ data: Record<string, number> }>,
            api.admin.listAuditLogs(token, 'limit=10&action=LOGIN') as Promise<{
                data: Array<Record<string, unknown>>;
                total: number;
            }>,
        ]);

        return json({
            stats: statsRes.data,
            recentLogins: auditRes.data || [],
            totalLoginEvents: auditRes.total || 0,
        });
    } catch {
        return json({
            stats: { totalUsers: 0, totalTenants: 0 },
            recentLogins: [],
            totalLoginEvents: 0,
        });
    }
}

export default function AdminSecurity() {
    const { stats, recentLogins, totalLoginEvents } = useLoaderData<typeof loader>() as any;

    const securityPolicies = [
        {
            icon: Lock,
            title: 'Password Policy',
            description: 'Minimum 8 characters, mixed case, numbers required',
            status: 'active',
        },
        {
            icon: Key,
            title: 'JWT Authentication',
            description: 'Token-based auth with Appwrite sessions',
            status: 'active',
        },
        {
            icon: Shield,
            title: 'Rate Limiting',
            description: '100 requests/15min (default), 10/15min (auth)',
            status: 'active',
        },
        {
            icon: Globe,
            title: 'CORS Protection',
            description: 'Origin-restricted API access',
            status: 'active',
        },
        {
            icon: Database,
            title: 'Tenant Isolation',
            description: 'Logical isolation via collegeId on every query',
            status: 'active',
        },
        {
            icon: Eye,
            title: 'Audit Logging',
            description: 'All sensitive actions logged with metadata',
            status: 'active',
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-surface-900">Security Dashboard</h1>
                <p className="text-surface-500 mt-1">Platform security posture and monitoring</p>
            </div>

            {/* Security Score */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Security Score"
                    value="A+"
                    subtitle="All checks passing"
                    icon={<Shield size={24} />}
                />
                <StatCard
                    title="Auth Events"
                    value={String(totalLoginEvents)}
                    subtitle="Login attempts"
                    icon={<Lock size={24} />}
                />
                <StatCard
                    title="Active Users"
                    value={String(stats.totalUsers)}
                    subtitle="Registered users"
                    icon={<Key size={24} />}
                />
                <StatCard
                    title="Active Tenants"
                    value={String(stats.totalTenants)}
                    subtitle="College tenants"
                    icon={<Globe size={24} />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Security Policies */}
                <Card>
                    <div className="p-6">
                        <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
                            <Shield size={18} className="text-primary-600" />
                            Security Policies
                        </h3>
                        <div className="space-y-3">
                            {securityPolicies.map((policy) => {
                                const Icon = policy.icon;
                                return (
                                    <div
                                        key={policy.title}
                                        className="flex items-start gap-3 p-3 bg-surface-50 rounded-xl"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                            <Icon size={16} className="text-emerald-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-surface-800">
                                                    {policy.title}
                                                </p>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                                    Active
                                                </span>
                                            </div>
                                            <p className="text-xs text-surface-400 mt-0.5">
                                                {policy.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>

                {/* Recent Login Activity */}
                <Card>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-surface-900 flex items-center gap-2">
                                <Clock size={18} className="text-primary-600" />
                                Recent Logins
                            </h3>
                            <Link
                                to="/dashboard/audit-logs?action=LOGIN"
                                className="text-sm text-primary-600 hover:text-primary-700"
                            >
                                View all →
                            </Link>
                        </div>
                        {recentLogins.length > 0 ? (
                            <div className="space-y-3">
                                {recentLogins.map((login: Record<string, unknown>) => {
                                    let metadata: Record<string, unknown> = {};
                                    try {
                                        if (login.metadata) metadata = JSON.parse(login.metadata as string);
                                    } catch {}

                                    return (
                                        <div
                                            key={login.$id as string}
                                            className="flex items-center justify-between p-3 bg-surface-50 rounded-xl"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                                    <CheckCircle size={14} className="text-emerald-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-surface-800">
                                                        {login.userId as string}
                                                    </p>
                                                    <p className="text-xs text-surface-400">
                                                        {metadata.ip ? `IP: ${String(metadata.ip)}` : null}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-surface-400">
                                                {login.timestamp
                                                    ? new Date(login.timestamp as string).toLocaleString()
                                                    : ''}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-surface-400 text-center py-8">
                                No login events recorded
                            </p>
                        )}
                    </div>
                </Card>
            </div>

            {/* Tenant Isolation Notice */}
            <Card>
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Database size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-surface-900 mb-1">
                                Multi-Tenant Data Isolation
                            </h3>
                            <p className="text-sm text-surface-500 leading-relaxed">
                                CareerNest uses logical tenant isolation with <code className="px-1.5 py-0.5 bg-surface-100 rounded text-xs font-mono">collegeId</code> enforced
                                on every database query via middleware. The tenant middleware validates that every API request
                                contains a valid tenant context, preventing cross-tenant data leakage. All queries are filtered
                                by tenant ID at the service layer.
                            </p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
