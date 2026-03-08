import { useState } from 'react';
import {
    Search,
    Briefcase,
    Ban,
    CheckCircle,
    MoreVertical,
    Building2,
    Mail,
    Phone,
    User,
} from 'lucide-react';
import { Card } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useSearchParams, Form, Link } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Company Oversight – Super Admin – CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || '1';
    const status = url.searchParams.get('status') || '';
    const tenantId = url.searchParams.get('tenantId') || '';
    const search = url.searchParams.get('search') || '';

    try {
        const params = new URLSearchParams({ page, limit: '20' });
        if (status) params.set('status', status);
        if (tenantId) params.set('tenantId', tenantId);
        if (search) params.set('search', search);

        const [companiesRes, tenantsRes] = await Promise.all([
            api.admin.listCompanies(token, params.toString()) as Promise<{
                data: Array<Record<string, unknown>>;
                total: number;
            }>,
            api.tenants.list(token, 'limit=100') as Promise<{
                data: Array<Record<string, unknown>>;
            }>,
        ]);

        return json({
            companies: companiesRes.data || [],
            total: companiesRes.total || 0,
            page: parseInt(page),
            limit: 20,
            tenants: tenantsRes.data || [],
            filters: { status, tenantId, search },
        });
    } catch {
        return json({
            companies: [],
            total: 0,
            page: 1,
            limit: 20,
            tenants: [],
            filters: { status, tenantId, search },
        });
    }
}

export async function action({ request }: ActionFunctionArgs) {
    const { token } = await requireUserSession(request);
    const formData = await request.formData();
    const companyId = formData.get('companyId') as string;
    const status = formData.get('status') as string;

    try {
        await api.admin.updateCompanyStatus(token, companyId, status);
        return json({ success: true });
    } catch (error: unknown) {
        const err = error as { message?: string };
        return json({ success: false, error: err.message }, { status: 400 });
    }
}

export default function AdminCompanies() {
    const { companies, total, page, limit, tenants, filters } = useLoaderData<typeof loader>() as any;
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
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
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-surface-900">Company Oversight</h1>
                <p className="text-surface-500 mt-1">
                    {total} compan{total !== 1 ? 'ies' : 'y'} across all colleges
                </p>
            </div>

            {/* Filters */}
            <Card>
                <div className="p-4 flex flex-wrap items-center gap-4">
                    <Form method="get" className="relative flex-1 min-w-[200px]">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                        <input
                            type="text"
                            name="search"
                            placeholder="Search companies..."
                            defaultValue={filters.search}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        />
                        {filters.status && <input type="hidden" name="status" value={filters.status} />}
                        {filters.tenantId && <input type="hidden" name="tenantId" value={filters.tenantId} />}
                    </Form>
                    <select
                        className="form-input w-36"
                        value={filters.status}
                        onChange={(e) => updateFilter('status', e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <select
                        className="form-input w-48"
                        value={filters.tenantId}
                        onChange={(e) => updateFilter('tenantId', e.target.value)}
                    >
                        <option value="">All Colleges</option>
                        {tenants.map((t: Record<string, unknown>) => (
                            <option key={t.$id as string} value={t.$id as string}>{t.name as string}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* Companies Grid */}
            {companies.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {companies.map((company: Record<string, unknown>) => (
                            <Card key={company.$id as string} hover>
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                                                {(company.name as string)?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-surface-900 text-sm">
                                                    {company.name as string}
                                                </h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${company.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-500'}`}>
                                                    {company.status as string}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setActiveMenu(activeMenu === (company.$id as string) ? null : (company.$id as string))}
                                                className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-100"
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                            {activeMenu === (company.$id as string) && (
                                                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-surface-200 py-2 z-50">
                                                    {company.status !== 'active' && (
                                                        <Form method="post">
                                                            <input type="hidden" name="companyId" value={company.$id as string} />
                                                            <input type="hidden" name="status" value="active" />
                                                            <button type="submit" className="w-full flex items-center gap-2 px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50" onClick={() => setActiveMenu(null)}>
                                                                <CheckCircle size={14} /> Activate
                                                            </button>
                                                        </Form>
                                                    )}
                                                    {company.status !== 'inactive' && (
                                                        <Form method="post">
                                                            <input type="hidden" name="companyId" value={company.$id as string} />
                                                            <input type="hidden" name="status" value="inactive" />
                                                            <button type="submit" className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => setActiveMenu(null)}>
                                                                <Ban size={14} /> Deactivate
                                                            </button>
                                                        </Form>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm text-surface-500">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={14} className="text-surface-400" />
                                            <span>{getTenantName(company.tenantId as string)}</span>
                                        </div>
                                        {company.contactPerson ? (
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-surface-400" />
                                                <span>{String(company.contactPerson)}</span>
                                            </div>
                                        ) : null}
                                        {company.contactEmail ? (
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} className="text-surface-400" />
                                                <span className="truncate">{String(company.contactEmail)}</span>
                                            </div>
                                        ) : null}
                                        {company.contactPhone ? (
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} className="text-surface-400" />
                                                <span>{String(company.contactPhone)}</span>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
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
                </>
            ) : (
                <Card>
                    <div className="text-center py-16">
                        <Briefcase size={48} className="mx-auto text-surface-300 mb-4" />
                        <h3 className="text-lg font-semibold text-surface-700 mb-2">No companies found</h3>
                        <p className="text-surface-400 text-sm">
                            {Object.values(filters).some(Boolean)
                                ? 'Try adjusting your filters'
                                : 'No companies registered on the platform yet'}
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}
