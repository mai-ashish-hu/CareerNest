import { Building2, Eye } from 'lucide-react';
import { Card } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Subscriptions - Super Admin - CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);

    try {
        const tenantsRes = await api.tenants.list(token, 'limit=100') as {
            data: Array<Record<string, unknown>>;
            total: number;
        };

        return json({ tenants: tenantsRes.data || [], total: tenantsRes.total || 0 });
    } catch {
        return json({ tenants: [], total: 0 });
    }
}

export default function AdminSubscriptions() {
    const { tenants, total } = useLoaderData<typeof loader>() as any;

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-surface-900">Subscriptions</h1>
                <p className="text-surface-500 mt-1">{total} college{total !== 1 ? 's' : ''} on the platform</p>
            </div>

            <Card>
                <div className="p-6">
                    <h3 className="font-semibold text-surface-900 mb-4">All Colleges</h3>
                    {tenants.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-surface-100">
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase">College ID</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase">College Name</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Created</th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tenants.map((tenant: Record<string, unknown>) => (
                                        <tr
                                            key={tenant.$id as string}
                                            className="border-b border-surface-50 hover:bg-surface-50"
                                        >
                                            <td className="py-3 px-4">
                                                <span className="text-sm font-mono font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-lg">
                                                    {tenant.collegeId as string}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Link
                                                    to={`/dashboard/tenants/${tenant.$id}`}
                                                    className="text-sm font-medium text-surface-800 hover:text-primary-600"
                                                >
                                                    {tenant.collegeName as string}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-surface-400">
                                                {tenant.$createdAt
                                                    ? new Date(tenant.$createdAt as string).toLocaleDateString()
                                                    : 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <Link
                                                    to={`/dashboard/tenants/${tenant.$id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                                                >
                                                    <Eye size={14} /> View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-surface-400 text-center py-8">No colleges yet</p>
                    )}
                </div>
            </Card>
        </div>
    );
}