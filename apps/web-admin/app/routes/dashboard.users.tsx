import { useState } from 'react';
import {
    Search,
    Users,
    Shield,
    Ban,
    CheckCircle,
    XCircle,
    MoreVertical,
    UserPlus,
    Filter,
} from 'lucide-react';
import { Button, Card, Modal } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useSearchParams, Form, useNavigation, Link } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'User Governance – Super Admin – CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || '1';
    const role = url.searchParams.get('role') || '';
    const status = url.searchParams.get('status') || '';
    const tenantId = url.searchParams.get('tenantId') || '';
    const search = url.searchParams.get('search') || '';

    try {
        const params = new URLSearchParams({ page, limit: '20' });
        if (role) params.set('role', role);
        if (status) params.set('status', status);
        if (tenantId) params.set('tenantId', tenantId);
        if (search) params.set('search', search);

        const [usersRes, tenantsRes] = await Promise.all([
            api.admin.listUsers(token, params.toString()) as Promise<{
                data: Array<Record<string, unknown>>;
                total: number;
            }>,
            api.tenants.list(token, 'limit=100') as Promise<{
                data: Array<Record<string, unknown>>;
                total: number;
            }>,
        ]);

        return json({
            users: usersRes.data || [],
            total: usersRes.total || 0,
            page: parseInt(page),
            limit: 20,
            tenants: tenantsRes.data || [],
            filters: { role, status, tenantId, search },
        });
    } catch {
        return json({
            users: [],
            total: 0,
            page: 1,
            limit: 20,
            tenants: [],
            filters: { role, status, tenantId, search },
        });
    }
}

export async function action({ request }: ActionFunctionArgs) {
    const { token } = await requireUserSession(request);
    const formData = await request.formData();
    const intent = formData.get('intent') as string;

    if (intent === 'updateStatus') {
        const userId = formData.get('userId') as string;
        const newStatus = formData.get('status') as string;
        try {
            await api.admin.updateUserStatus(token, userId, newStatus);
            return json({ success: true });
        } catch (error: unknown) {
            const err = error as { message?: string };
            return json({ success: false, error: err.message }, { status: 400 });
        }
    }

    if (intent === 'createUser') {
        const data = {
            tenantId: formData.get('tenantId') as string,
            email: formData.get('email') as string,
            name: formData.get('name') as string,
            role: formData.get('role') as string,
            department: formData.get('department') as string || undefined,
        };
        try {
            await api.admin.createUser(token, data);
            return json({ success: true, message: 'User created' });
        } catch (error: unknown) {
            const err = error as { message?: string };
            return json({ success: false, error: err.message }, { status: 400 });
        }
    }

    return json({ success: false }, { status: 400 });
}

const roleColors: Record<string, string> = {
    super_admin: 'bg-rose-100 text-rose-700',
    tpo: 'bg-violet-100 text-violet-700',
    tpo_assistant: 'bg-indigo-100 text-indigo-700',
    student: 'bg-blue-100 text-blue-700',
    company: 'bg-amber-100 text-amber-700',
};

const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-surface-100 text-surface-500',
    blocked: 'bg-red-100 text-red-700',
};

export default function AdminUsers() {
    const { users, total, page, limit, tenants, filters } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === 'submitting';
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const totalPages = Math.ceil(total / limit);

    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value) params.set(key, value);
        else params.delete(key);
        params.delete('page');
        setSearchParams(params);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900">User Governance</h1>
                    <p className="text-surface-500 mt-1">
                        {total} user{total !== 1 ? 's' : ''} across all tenants
                    </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <UserPlus size={18} /> Add User
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <div className="p-4 flex flex-wrap items-center gap-4">
                    <Form method="get" className="relative flex-1 min-w-[200px]">
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
                        />
                        <input
                            type="text"
                            name="search"
                            placeholder="Search users by name..."
                            defaultValue={filters.search}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        />
                        {filters.role && <input type="hidden" name="role" value={filters.role} />}
                        {filters.status && <input type="hidden" name="status" value={filters.status} />}
                        {filters.tenantId && <input type="hidden" name="tenantId" value={filters.tenantId} />}
                    </Form>
                    <select
                        className="form-input w-36"
                        value={filters.role}
                        onChange={(e) => updateFilter('role', e.target.value)}
                    >
                        <option value="">All Roles</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="tpo">TPO</option>
                        <option value="tpo_assistant">TPO Assistant</option>
                        <option value="student">Student</option>
                        <option value="company">Company</option>
                    </select>
                    <select
                        className="form-input w-36"
                        value={filters.status}
                        onChange={(e) => updateFilter('status', e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="blocked">Blocked</option>
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

            {/* Users Table */}
            {users.length > 0 ? (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-surface-100">
                                    <th className="text-left py-3 px-5 text-xs font-semibold text-surface-500 uppercase">User</th>
                                    <th className="text-left py-3 px-5 text-xs font-semibold text-surface-500 uppercase">Email</th>
                                    <th className="text-left py-3 px-5 text-xs font-semibold text-surface-500 uppercase">Role</th>
                                    <th className="text-left py-3 px-5 text-xs font-semibold text-surface-500 uppercase">College</th>
                                    <th className="text-left py-3 px-5 text-xs font-semibold text-surface-500 uppercase">Status</th>
                                    <th className="text-right py-3 px-5 text-xs font-semibold text-surface-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user: Record<string, unknown>) => {
                                    const tenantName = tenants.find(
                                        (t: Record<string, unknown>) => t.$id === user.tenantId
                                    )?.name || user.tenantId;

                                    return (
                                        <tr
                                            key={user.$id as string}
                                            className="border-b border-surface-50 hover:bg-surface-50 transition-colors"
                                        >
                                            <td className="py-3 px-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-semibold">
                                                        {(user.name as string)?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium text-surface-800">
                                                        {user.name as string}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-5 text-sm text-surface-500">
                                                {user.email as string}
                                            </td>
                                            <td className="py-3 px-5">
                                                <span
                                                    className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${roleColors[(user.role as string) || ''] || 'bg-surface-100 text-surface-500'}`}
                                                >
                                                    {(user.role as string)?.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="py-3 px-5 text-sm text-surface-500">
                                                {user.tenantId === 'global' ? (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 font-medium">
                                                        Global
                                                    </span>
                                                ) : (
                                                    <Link
                                                        to={`/dashboard/tenants/${user.tenantId}`}
                                                        className="text-primary-600 hover:text-primary-700"
                                                    >
                                                        {tenantName as string}
                                                    </Link>
                                                )}
                                            </td>
                                            <td className="py-3 px-5">
                                                <span
                                                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[(user.status as string) || ''] || 'bg-surface-100 text-surface-500'}`}
                                                >
                                                    {user.status as string}
                                                </span>
                                            </td>
                                            <td className="py-3 px-5 text-right">
                                                <div className="relative inline-block">
                                                    <button
                                                        onClick={() =>
                                                            setActiveMenu(
                                                                activeMenu === (user.$id as string)
                                                                    ? null
                                                                    : (user.$id as string)
                                                            )
                                                        }
                                                        className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>
                                                    {activeMenu === (user.$id as string) && (
                                                        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-surface-200 py-2 z-50">
                                                            {user.status !== 'active' && (
                                                                <Form method="post">
                                                                    <input type="hidden" name="intent" value="updateStatus" />
                                                                    <input type="hidden" name="userId" value={user.$id as string} />
                                                                    <input type="hidden" name="status" value="active" />
                                                                    <button
                                                                        type="submit"
                                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50"
                                                                        onClick={() => setActiveMenu(null)}
                                                                    >
                                                                        <CheckCircle size={14} /> Activate
                                                                    </button>
                                                                </Form>
                                                            )}
                                                            {user.status !== 'blocked' && (
                                                                <Form method="post">
                                                                    <input type="hidden" name="intent" value="updateStatus" />
                                                                    <input type="hidden" name="userId" value={user.$id as string} />
                                                                    <input type="hidden" name="status" value="blocked" />
                                                                    <button
                                                                        type="submit"
                                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                                                        onClick={() => setActiveMenu(null)}
                                                                    >
                                                                        <Ban size={14} /> Block
                                                                    </button>
                                                                </Form>
                                                            )}
                                                            {user.status !== 'inactive' && (
                                                                <Form method="post">
                                                                    <input type="hidden" name="intent" value="updateStatus" />
                                                                    <input type="hidden" name="userId" value={user.$id as string} />
                                                                    <input type="hidden" name="status" value="inactive" />
                                                                    <button
                                                                        type="submit"
                                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-surface-600 hover:bg-surface-50"
                                                                        onClick={() => setActiveMenu(null)}
                                                                    >
                                                                        <XCircle size={14} /> Deactivate
                                                                    </button>
                                                                </Form>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between p-4 border-t border-surface-100">
                            <p className="text-sm text-surface-400">
                                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
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
                        <Users size={48} className="mx-auto text-surface-300 mb-4" />
                        <h3 className="text-lg font-semibold text-surface-700 mb-2">No users found</h3>
                        <p className="text-surface-400 text-sm">
                            {Object.values(filters).some(Boolean)
                                ? 'Try adjusting your filters'
                                : 'No users registered yet'}
                        </p>
                    </div>
                </Card>
            )}

            {/* Create User Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Add New User"
                size="md"
            >
                <Form method="post" className="space-y-5">
                    <input type="hidden" name="intent" value="createUser" />

                    <div>
                        <label className="form-label">College *</label>
                        <select name="tenantId" required className="form-input">
                            <option value="">Select college...</option>
                            <option value="global">Global (Super Admin)</option>
                            {tenants.map((t: Record<string, unknown>) => (
                                <option key={t.$id as string} value={t.$id as string}>
                                    {t.name as string}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="form-label">Full Name *</label>
                        <input type="text" name="name" required className="form-input" placeholder="John Doe" />
                    </div>

                    <div>
                        <label className="form-label">Email *</label>
                        <input type="email" name="email" required className="form-input" placeholder="user@example.com" />
                    </div>

                    <div>
                        <label className="form-label">Role *</label>
                        <select name="role" required className="form-input">
                            <option value="">Select role...</option>
                            <option value="super_admin">Super Admin</option>
                            <option value="tpo">TPO</option>
                            <option value="tpo_assistant">TPO Assistant</option>
                            <option value="student">Student</option>
                            <option value="company">Company</option>
                        </select>
                    </div>

                    <div>
                        <label className="form-label">Department</label>
                        <input type="text" name="department" className="form-input" placeholder="Computer Science (optional)" />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                        <Button variant="ghost" type="button" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            <UserPlus size={16} /> Create User
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
