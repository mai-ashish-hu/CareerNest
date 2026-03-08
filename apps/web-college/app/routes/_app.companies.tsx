import { useState, useEffect } from 'react';
import { Plus, Search, Building2, Mail, Phone, User, Eye, Pencil, Lock } from 'lucide-react';
import { Button, Card, Badge, Modal, Input, Table, EmptyState, Avatar } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Companies – College – CareerNest' }];

interface Company {
    id: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    status: 'active' | 'inactive';
    totalDrives: number;
    totalHired: number;
    lastDrive: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) throw redirect('/login');
    const tenantId = user.tenantId;

    const companiesRes = await api.companies.list(token, `tenantId=${tenantId}&limit=500`).catch(() => ({ data: [], total: 0 })) as { data: any[]; total: number };

    const companies: Company[] = (companiesRes.data || []).map((c: any) => ({
        id: c.$id || c.id || '',
        name: c.name || '',
        contactPerson: c.contactPerson || '',
        email: c.contactEmail || c.email || '',
        phone: c.contactPhone || c.phone || '',
        status: c.status || 'active',
        totalDrives: c.totalDrives ?? 0,
        totalHired: c.totalHired ?? 0,
        lastDrive: c.lastDrive || c.$updatedAt || '',
    }));

    return json({ companies });
}

export async function action({ request }: ActionFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) throw redirect('/login');

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const contactPerson = formData.get('contactPerson') as string;
    const contactEmail = formData.get('contactEmail') as string;
    const contactPhone = formData.get('contactPhone') as string;
    const password = formData.get('password') as string;

    if (!name || !contactPerson || !contactEmail || !password) {
        return json({ success: false, error: 'Please fill all required fields.' }, { status: 400 });
    }

    try {
        await api.companies.create(token, {
            name,
            contactPerson,
            contactEmail,
            contactPhone: contactPhone || '',
            password,
        });
        return json({ success: true });
    } catch (err: any) {
        return json({ success: false, error: err?.message || 'Failed to add company.' }, { status: 500 });
    }
}

export default function Companies() {
    const { companies } = useLoaderData<typeof loader>() as { companies: Company[] };
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const fetcher = useFetcher<{ success?: boolean; error?: string }>();

    const isSubmitting = fetcher.state !== 'idle';

    // Close modal on successful submission
    useEffect(() => {
        if (fetcher.data?.success) {
            setShowModal(false);
        }
    }, [fetcher.data]);

    const filtered = companies.filter((c) => {
        const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = !statusFilter || c.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const columns = [
        {
            header: 'Company',
            accessor: (row: Company) => (
                <div className="flex items-center gap-3">
                    <Avatar name={row.name} size="sm" />
                    <div>
                        <p className="font-medium text-surface-900">{row.name}</p>
                        <p className="text-xs text-surface-400">{row.email}</p>
                    </div>
                </div>
            ),
        },
        {
            header: 'Contact Person',
            accessor: (row: Company) => (
                <div>
                    <p className="text-surface-700">{row.contactPerson}</p>
                    <p className="text-xs text-surface-400">{row.phone}</p>
                </div>
            ),
        },
        {
            header: 'Drives',
            accessor: (row: Company) => <span className="font-semibold text-surface-800">{row.totalDrives}</span>,
            className: 'text-center',
        },
        {
            header: 'Hired',
            accessor: (row: Company) => <span className="font-semibold text-emerald-600">{row.totalHired}</span>,
            className: 'text-center',
        },
        {
            header: 'Last Drive',
            accessor: (row: Company) => <span className="text-surface-500 text-xs">{row.lastDrive}</span>,
        },
        {
            header: 'Status',
            accessor: (row: Company) => (
                <Badge variant={row.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-600'}>
                    {row.status}
                </Badge>
            ),
        },
        {
            header: '',
            accessor: (row: Company) => (
                <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="View">
                        <Eye size={15} />
                    </button>
                    <button className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Edit">
                        <Pencil size={15} />
                    </button>
                </div>
            ),
            className: 'w-20',
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900">Companies</h1>
                    <p className="text-surface-500 mt-1">Manage registered companies and partnerships</p>
                </div>
                <Button onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Add Company
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Building2 size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{companies.length}</p>
                            <p className="text-xs text-surface-500">Total Companies</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Building2 size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{companies.filter(c => c.status === 'active').length}</p>
                            <p className="text-xs text-surface-500">Active Companies</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-50 text-purple-600"><User size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{companies.reduce((a, c) => a + c.totalHired, 0)}</p>
                            <p className="text-xs text-surface-500">Total Hired</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="!p-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                        <input
                            type="text"
                            placeholder="Search by company name or contact person..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="form-input w-36 !py-2.5"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </Card>

            {/* Table */}
            {filtered.length > 0 ? (
                <Table columns={columns} data={filtered} keyExtractor={(row) => row.id} />
            ) : (
                <Card>
                    <EmptyState
                        icon={<Building2 size={28} />}
                        title="No companies found"
                        description={searchQuery ? 'Try adjusting your search or filters.' : 'Add your first company to get started with placement drives.'}
                        action={!searchQuery ? <Button onClick={() => setShowModal(true)}><Plus size={16} /> Add Company</Button> : undefined}
                    />
                </Card>
            )}

            {/* Add Company Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Company" size="lg">
                <fetcher.Form method="post" className="space-y-5">
                    {fetcher.data?.error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
                            {fetcher.data.error}
                        </div>
                    )}
                    <Input name="name" label="Company Name" placeholder="e.g., TechCorp India" required />
                    <div className="grid grid-cols-2 gap-4">
                        <Input name="contactPerson" label="Contact Person" placeholder="Full name" icon={<User size={16} />} required />
                        <Input name="contactEmail" type="email" label="Email Address" placeholder="hr@company.com" icon={<Mail size={16} />} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input name="contactPhone" label="Phone Number" placeholder="+91 98765 43210" icon={<Phone size={16} />} />
                        <Input name="password" type="password" label="Password" placeholder="Min 8 characters" icon={<Lock size={16} />} required />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                        <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Adding...' : 'Add Company'}
                        </Button>
                    </div>
                </fetcher.Form>
            </Modal>
        </div>
    );
}
