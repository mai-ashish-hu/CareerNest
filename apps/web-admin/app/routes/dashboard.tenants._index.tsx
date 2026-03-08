import { useState } from 'react';
import {
    Plus,
    Building2,
    Eye,
    Trash2,
    UserPlus,
} from 'lucide-react';
import { Button, Card, Modal } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useSearchParams, Form, useNavigation, Link } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Colleges - Super Admin - CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || '1';

    try {
        const params = new URLSearchParams({ page, limit: '20' });

        const result = await api.tenants.list(token, params.toString()) as {
            success: boolean;
            data: Array<Record<string, unknown>>;
            total: number;
            page: number;
            limit: number;
        };

        return json({
            tenants: result.data || [],
            total: result.total || 0,
            page: parseInt(page),
            limit: 20,
        });
    } catch {
        return json({ tenants: [], total: 0, page: 1, limit: 20 });
    }
}

export async function action({ request }: ActionFunctionArgs) {
    const { token } = await requireUserSession(request);
    const formData = await request.formData();
    const intent = formData.get('intent') as string;

    if (intent === 'create') {
        // Parse admins from form data
        const admins: Array<{ name: string; email: string; password: string; role: string }> = [];
        let i = 0;
        while (formData.get(`admins[${i}].name`)) {
            admins.push({
                name: formData.get(`admins[${i}].name`) as string,
                email: formData.get(`admins[${i}].email`) as string,
                password: formData.get(`admins[${i}].password`) as string,
                role: formData.get(`admins[${i}].role`) as string,
            });
            i++;
        }

        const data: Record<string, unknown> = {
            collegeId: formData.get('collegeId') as string,
            collegeName: formData.get('collegeName') as string,
            address: formData.get('address') as string,
            city: formData.get('city') as string,
            state: formData.get('state') as string,
            pincode: parseInt(formData.get('pincode') as string, 10),
            phone: parseInt(formData.get('phone') as string, 10),
            email: formData.get('email') as string,
            website: formData.get('website') as string,
            establishedYear: parseInt(formData.get('establishedYear') as string, 10),
        };

        if (admins.length > 0) data.admins = admins;

        try {
            await api.tenants.create(token, data);
            return json({ success: true, message: 'College created successfully' });
        } catch (error: unknown) {
            const err = error as { message?: string };
            return json({ success: false, error: err.message || 'Failed to create college' }, { status: 400 });
        }
    }

    return json({ success: false, error: 'Invalid action' }, { status: 400 });
}

export default function AdminTenants() {
    const { tenants, total, page, limit } = useLoaderData<typeof loader>() as any;
    const [searchParams] = useSearchParams();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === 'submitting';

    const [showCreateModal, setShowCreateModal] = useState(
        searchParams.get('action') === 'create'
    );
    const [admins, setAdmins] = useState<Array<{ name: string; email: string; password: string; role: string }>>([]);

    const addAdmin = () => {
        setAdmins([...admins, { name: '', email: '', password: '', role: 'tpo' }]);
    };

    const removeAdmin = (index: number) => {
        setAdmins(admins.filter((_, i) => i !== index));
    };

    const updateAdmin = (index: number, field: string, value: string) => {
        const updated = [...admins];
        updated[index] = { ...updated[index], [field]: value };
        setAdmins(updated);
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setAdmins([]);
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900">
                        College Management
                    </h1>
                    <p className="text-surface-500 mt-1">
                        {total} college{total !== 1 ? 's' : ''} registered on the platform
                    </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus size={18} /> Add College
                </Button>
            </div>

            {/* College List */}
            {tenants.length > 0 ? (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-surface-100">
                                    <th className="text-left py-3 px-5 text-xs font-semibold text-surface-500 uppercase">College ID</th>
                                    <th className="text-left py-3 px-5 text-xs font-semibold text-surface-500 uppercase">College Name</th>
                                    <th className="text-left py-3 px-5 text-xs font-semibold text-surface-500 uppercase">Created</th>
                                    <th className="text-right py-3 px-5 text-xs font-semibold text-surface-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.map((tenant: Record<string, unknown>) => (
                                    <tr key={tenant.$id as string} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                                        <td className="py-3.5 px-5">
                                            <span className="text-sm font-mono font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg">
                                                {tenant.collegeId as string}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                    {(tenant.collegeName as string)?.charAt(0).toUpperCase()}
                                                </div>
                                                <Link
                                                    to={`/dashboard/tenants/${tenant.$id}`}
                                                    className="text-sm font-semibold text-surface-900 hover:text-primary-600 transition-colors"
                                                >
                                                    {tenant.collegeName as string}
                                                </Link>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-5 text-sm text-surface-400">
                                            {tenant.$createdAt
                                                ? new Date(tenant.$createdAt as string).toLocaleDateString()
                                                : '-'}
                                        </td>
                                        <td className="py-3.5 px-5 text-right">
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

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100">
                            <p className="text-sm text-surface-400">
                                Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
                            </p>
                            <div className="flex items-center gap-2">
                                {page > 1 && (
                                    <Link
                                        to={`?page=${page - 1}`}
                                        className="px-3 py-1.5 text-sm rounded-lg border border-surface-200 hover:bg-surface-50"
                                    >
                                        Previous
                                    </Link>
                                )}
                                {page < totalPages && (
                                    <Link
                                        to={`?page=${page + 1}`}
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
                        <Building2 size={48} className="mx-auto text-surface-300 mb-4" />
                        <h3 className="text-lg font-semibold text-surface-700 mb-2">
                            No colleges found
                        </h3>
                        <p className="text-surface-400 text-sm mb-6">
                            Get started by adding your first college
                        </p>
                        <Button onClick={() => setShowCreateModal(true)}>
                            <Plus size={18} /> Add College
                        </Button>
                    </div>
                </Card>
            )}

            {/* Create College Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={handleCloseModal}
                title="Add New College"
                size="xl"
            >
                <Form method="post" className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
                    <input type="hidden" name="intent" value="create" />

                    {/* Basic Info */}
                    <div>
                        <h4 className="text-sm font-semibold text-surface-700 uppercase tracking-wide mb-3">
                            Basic Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">College Name *</label>
                                <input
                                    type="text"
                                    name="collegeName"
                                    required
                                    placeholder="e.g. Indian Institute of Technology, Delhi"
                                    className="form-input"
                                />
                            </div>
                            <div>
                                <label className="form-label">College ID *</label>
                                <input
                                    type="text"
                                    name="collegeId"
                                    required
                                    placeholder="e.g. IITD, NITK, BITS-PIL"
                                    className="form-input"
                                />
                                <p className="text-xs text-surface-400 mt-1">
                                    A unique short identifier for this college
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Contact & Address */}
                    <div>
                        <h4 className="text-sm font-semibold text-surface-700 uppercase tracking-wide mb-3">
                            Contact & Address
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="form-label">Address *</label>
                                <input
                                    type="text"
                                    name="address"
                                    required
                                    placeholder="e.g. Hauz Khas, New Delhi"
                                    className="form-input"
                                />
                            </div>
                            <div>
                                <label className="form-label">City *</label>
                                <input
                                    type="text"
                                    name="city"
                                    required
                                    placeholder="e.g. New Delhi"
                                    className="form-input"
                                />
                            </div>
                            <div>
                                <label className="form-label">State *</label>
                                <input
                                    type="text"
                                    name="state"
                                    required
                                    placeholder="e.g. Delhi"
                                    className="form-input"
                                />
                            </div>
                            <div>
                                <label className="form-label">Pincode *</label>
                                <input
                                    type="number"
                                    name="pincode"
                                    required
                                    placeholder="e.g. 110016"
                                    className="form-input"
                                />
                            </div>
                            <div>
                                <label className="form-label">Phone Number *</label>
                                <input
                                    type="number"
                                    name="phone"
                                    required
                                    placeholder="e.g. 1126591715"
                                    className="form-input"
                                />
                            </div>
                            <div>
                                <label className="form-label">Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    placeholder="e.g. tpo@iitd.ac.in"
                                    className="form-input"
                                />
                            </div>
                            <div>
                                <label className="form-label">Website *</label>
                                <input
                                    type="url"
                                    name="website"
                                    required
                                    placeholder="e.g. https://iitd.ac.in"
                                    className="form-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Additional Details */}
                    <div>
                        <h4 className="text-sm font-semibold text-surface-700 uppercase tracking-wide mb-3">
                            Additional Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Established Year *</label>
                                <input
                                    type="number"
                                    name="establishedYear"
                                    required
                                    placeholder="e.g. 1961"
                                    min={1800}
                                    max={new Date().getFullYear()}
                                    className="form-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* College Admins */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-surface-700 uppercase tracking-wide">
                                College Admins
                            </h4>
                            <button
                                type="button"
                                onClick={addAdmin}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                            >
                                <UserPlus size={14} /> Add Admin
                            </button>
                        </div>

                        {admins.length === 0 ? (
                            <div className="text-center py-6 bg-surface-50 rounded-xl border border-dashed border-surface-200">
                                <UserPlus size={28} className="mx-auto text-surface-300 mb-2" />
                                <p className="text-sm text-surface-400">
                                    No admins added yet. Click &quot;Add Admin&quot; to assign admins for this college.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {admins.map((admin, index) => (
                                    <div
                                        key={index}
                                        className="p-4 bg-surface-50 rounded-xl border border-surface-100 relative"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => removeAdmin(index)}
                                            className="absolute top-3 right-3 p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Remove admin"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                        <p className="text-xs font-semibold text-surface-500 mb-3">
                                            Admin #{index + 1}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                            <div>
                                                <label className="form-label">Name *</label>
                                                <input
                                                    type="text"
                                                    name={`admins[${index}].name`}
                                                    required
                                                    value={admin.name}
                                                    onChange={(e) => updateAdmin(index, 'name', e.target.value)}
                                                    placeholder="Full name"
                                                    className="form-input"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label">Email *</label>
                                                <input
                                                    type="email"
                                                    name={`admins[${index}].email`}
                                                    required
                                                    value={admin.email}
                                                    onChange={(e) => updateAdmin(index, 'email', e.target.value)}
                                                    placeholder="admin@college.edu"
                                                    className="form-input"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label">Password *</label>
                                                <input
                                                    type="password"
                                                    name={`admins[${index}].password`}
                                                    required
                                                    value={admin.password}
                                                    onChange={(e) => updateAdmin(index, 'password', e.target.value)}
                                                    placeholder="Min 8 characters"
                                                    minLength={8}
                                                    className="form-input"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label">Role *</label>
                                                <select
                                                    name={`admins[${index}].role`}
                                                    required
                                                    value={admin.role}
                                                    onChange={(e) => updateAdmin(index, 'role', e.target.value)}
                                                    className="form-input"
                                                >
                                                    <option value="tpo">TPO</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-100">
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={handleCloseModal}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            <Plus size={18} /> Add College
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}