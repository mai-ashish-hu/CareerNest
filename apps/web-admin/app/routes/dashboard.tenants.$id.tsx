import { useState } from 'react';
import {
    Building2,
    Users,
    Briefcase,
    ArrowLeft,
    Edit,
    MapPin,
    Phone,
    Mail,
    Globe,
    Calendar,
    TrendingUp,
    FileText,
    X,
    CheckCircle2,
    Shield,
} from 'lucide-react';
import { Button, Card, Modal } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link, Form, useNavigation } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [
    { title: 'College Details - Super Admin - CareerNest' },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const tenantId = params.id!;

    try {
        // Fetch all data in parallel
        const [tenantRes, companiesRes, drivesRes, placementsRes, teamRes] = await Promise.all([
            api.tenants.getById(token, tenantId) as Promise<{ data: Record<string, unknown> }>,
            api.admin.listCompanies(token, `tenantId=${tenantId}&limit=100`) as Promise<{ data: Array<Record<string, unknown>>; total: number }>,
            api.admin.listDrives(token, `tenantId=${tenantId}&limit=100`) as Promise<{ data: Array<Record<string, unknown>>; total: number }>,
            api.admin.listPlacements(token, `tenantId=${tenantId}&limit=100`) as Promise<{ data: Array<Record<string, unknown>>; total: number }>,
            api.tenants.getTeamMembers(token, tenantId).catch(() => ({ data: { teamId: null, members: [] } })) as Promise<{ data: { teamId: string | null; members: Array<Record<string, unknown>> } }>,
        ]);

        const companies = companiesRes.data || [];
        const drives = drivesRes.data || [];
        const placements = placementsRes.data || [];
        const teamData = teamRes.data || { teamId: null, members: [] };
        const teamMembers = (teamData.members || []) as Array<Record<string, unknown>>;

        // Compute role counts from team members
        const roleCounts = teamMembers.reduce((acc: Record<string, number>, m: Record<string, unknown>) => {
            const roles = (m.roles as string[]) || [];
            for (const role of roles) {
                if (role === 'owner') continue; // skip Appwrite internal role
                acc[role] = (acc[role] || 0) + 1;
            }
            return acc;
        }, {});

        // Count members and placed students
        const totalMembers = teamMembers.length;
        const placedCount = placements.length;
        const placementRate = totalMembers > 0 ? Math.round((placedCount / totalMembers) * 100) : 0;

        return json({
            tenant: tenantRes.data,
            companies,
            drives,
            placements,
            teamMembers,
            totalMembers,
            totalCompanies: companiesRes.total || 0,
            totalDrives: drivesRes.total || 0,
            totalPlacements: placementsRes.total || 0,
            roleCounts,
            placedCount,
            placementRate,
        });
    } catch {
        throw new Response('Tenant not found', { status: 404 });
    }
}

export async function action({ request, params }: ActionFunctionArgs) {
    const { token } = await requireUserSession(request);
    const formData = await request.formData();
    const intent = formData.get('intent') as string;

    if (intent === 'updateTenant') {
        const data: Record<string, unknown> = {};
        const fields = ['collegeName', 'address', 'city', 'state', 'email', 'website'];
        for (const f of fields) {
            const val = formData.get(f) as string;
            if (val) data[f] = val;
        }
        const pincode = formData.get('pincode') as string;
        if (pincode) data.pincode = parseInt(pincode, 10);
        const phone = formData.get('phone') as string;
        if (phone) data.phone = parseInt(phone, 10);
        const year = formData.get('establishedYear') as string;
        if (year) data.establishedYear = parseInt(year, 10);

        try {
            await api.tenants.update(token, params.id!, data);
            return json({ success: true, message: 'College updated' });
        } catch (error: unknown) {
            const err = error as { message?: string };
            return json({ success: false, error: err.message }, { status: 400 });
        }
    }

    return json({ success: false }, { status: 400 });
}

export default function TenantDetail() {
    const {
        tenant, companies, drives, placements, teamMembers,
        totalMembers, totalCompanies, totalDrives, totalPlacements,
        roleCounts, placedCount, placementRate,
    } = useLoaderData<typeof loader>() as any;

    const navigation = useNavigation();
    const isSubmitting = navigation.state === 'submitting';
    const [showEditModal, setShowEditModal] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Back + Header */}
            <div className="flex items-center gap-4">
                <Link
                    to="/dashboard/tenants"
                    className="p-2 rounded-xl hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-surface-900">
                            {tenant.collegeName as string}
                        </h1>
                        <span className="text-sm font-mono font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg">
                            {tenant.collegeId as string}
                        </span>
                    </div>
                    <p className="text-sm text-surface-400 mt-1">
                        Registered {tenant.$createdAt ? new Date(tenant.$createdAt as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                    </p>
                </div>
                <Button variant="secondary" onClick={() => setShowEditModal(true)}>
                    <Edit size={16} /> Edit College
                </Button>
            </div>

            {/* Stats Grid — all clickable */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <ClickableStat
                    label="Team Members"
                    value={totalMembers}
                    icon={<Users size={20} />}
                    color="primary"
                    active={expandedSection === 'members'}
                    onClick={() => toggleSection('members')}
                />
                <ClickableStat
                    label="Placed"
                    value={placedCount}
                    icon={<CheckCircle2 size={20} />}
                    color="emerald"
                    active={expandedSection === 'placements'}
                    onClick={() => toggleSection('placements')}
                />
                <ClickableStat
                    label="Companies"
                    value={totalCompanies}
                    icon={<Briefcase size={20} />}
                    color="violet"
                    active={expandedSection === 'companies'}
                    onClick={() => toggleSection('companies')}
                />
                <ClickableStat
                    label="Drives"
                    value={totalDrives}
                    icon={<FileText size={20} />}
                    color="amber"
                    active={expandedSection === 'drives'}
                    onClick={() => toggleSection('drives')}
                />
                <ClickableStat
                    label="Roles"
                    value={Object.keys(roleCounts).length}
                    icon={<Shield size={20} />}
                    color="sky"
                    active={expandedSection === 'roles'}
                    onClick={() => toggleSection('roles')}
                />
                <ClickableStat
                    label="Placement %"
                    value={`${placementRate}%`}
                    icon={<TrendingUp size={20} />}
                    color="rose"
                    active={expandedSection === 'analytics'}
                    onClick={() => toggleSection('analytics')}
                />
            </div>

            {/* Expanded Data Section */}
            {expandedSection && (
                <Card className="animate-fade-in">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-surface-900 capitalize">
                                {expandedSection === 'analytics' ? 'Placement Analytics' : expandedSection}
                            </h3>
                            <button
                                onClick={() => setExpandedSection(null)}
                                className="p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {expandedSection === 'members' && (
                            <DataTable
                                columns={['Name', 'Email', 'Roles', 'Joined']}
                                rows={teamMembers.map((m: any) => [
                                    m.userName || '-',
                                    m.userEmail || '-',
                                    (m.roles || []).filter((r: string) => r !== 'owner').join(', ').toUpperCase() || '-',
                                    m.joined ? new Date(m.joined).toLocaleDateString() : '-',
                                ])}
                                emptyMessage="No team members in this college"
                            />
                        )}

                        {expandedSection === 'placements' && (
                            <DataTable
                                columns={['Student ID', 'Drive ID', 'Company ID', 'CTC Offered', 'Placed At']}
                                rows={placements.map((p: any) => [
                                    p.studentId || '-',
                                    p.driveId || '-',
                                    p.companyId || '-',
                                    p.ctcOffered ? `₹${Number(p.ctcOffered).toLocaleString('en-IN')} LPA` : '-',
                                    p.placedAt ? new Date(p.placedAt).toLocaleDateString() : '-',
                                ])}
                                emptyMessage="No placements recorded yet"
                            />
                        )}

                        {expandedSection === 'companies' && (
                            <DataTable
                                columns={['Name', 'Contact Person', 'Email', 'Phone', 'Status']}
                                rows={companies.map((c: any) => [
                                    c.name,
                                    c.contactPerson || '-',
                                    c.contactEmail || '-',
                                    c.contactPhone || '-',
                                    c.status,
                                ])}
                                emptyMessage="No companies registered yet"
                            />
                        )}

                        {expandedSection === 'drives' && (
                            <DataTable
                                columns={['Job Role', 'Company ID', 'CTC', 'Deadline', 'Status']}
                                rows={drives.map((d: any) => [
                                    d.jobRole,
                                    d.companyId || '-',
                                    d.CTC ? `₹${Number(d.CTC).toLocaleString('en-IN')} LPA` : '-',
                                    d.deadline ? new Date(d.deadline).toLocaleDateString() : '-',
                                    d.status,
                                ])}
                                emptyMessage="No placement drives yet"
                            />
                        )}

                        {expandedSection === 'roles' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {Object.entries(roleCounts as Record<string, number>).map(([role, count]) => (
                                        <div key={role} className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
                                            <span className="text-sm text-surface-600 uppercase">{role}</span>
                                            <span className="text-sm font-bold text-surface-900">{count}</span>
                                        </div>
                                    ))}
                                    {Object.keys(roleCounts).length === 0 && (
                                        <p className="text-sm text-surface-400 col-span-full text-center py-4">No roles assigned yet</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {expandedSection === 'analytics' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-surface-50 rounded-xl text-center">
                                        <p className="text-3xl font-bold text-surface-900">{totalMembers}</p>
                                        <p className="text-sm text-surface-500 mt-1">Team Members</p>
                                    </div>
                                    <div className="p-4 bg-emerald-50 rounded-xl text-center">
                                        <p className="text-3xl font-bold text-emerald-700">{placedCount}</p>
                                        <p className="text-sm text-emerald-600 mt-1">Placed Students</p>
                                    </div>
                                    <div className="p-4 bg-primary-50 rounded-xl text-center">
                                        <p className="text-3xl font-bold text-primary-700">{placementRate}%</p>
                                        <p className="text-sm text-primary-600 mt-1">Placement Rate</p>
                                    </div>
                                </div>
                                <h4 className="text-sm font-semibold text-surface-700 mt-4">User Breakdown by Role</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {Object.entries(roleCounts as Record<string, number>).map(([role, count]) => (
                                        <div key={role} className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
                                            <span className="text-sm text-surface-600 capitalize">{role.replace(/_/g, ' ')}</span>
                                            <span className="text-sm font-bold text-surface-900">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* College Information */}
                <Card>
                    <div className="p-6">
                        <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
                            <Building2 size={18} /> College Information
                        </h3>
                        <div className="space-y-3">
                            <InfoRow label="College Name" value={tenant.collegeName} />
                            <InfoRow label="College ID" value={tenant.collegeId} />
                            <InfoRow label="Established" value={tenant.establishedYear ? String(tenant.establishedYear) : 'N/A'} icon={<Calendar size={14} />} />
                            <InfoRow
                                label="Created"
                                value={tenant.$createdAt ? new Date(tenant.$createdAt).toLocaleDateString() : 'N/A'}
                            />
                            <InfoRow
                                label="Last Updated"
                                value={tenant.$updatedAt ? new Date(tenant.$updatedAt).toLocaleDateString() : 'N/A'}
                            />
                        </div>
                    </div>
                </Card>

                {/* Contact & Address */}
                <Card>
                    <div className="p-6">
                        <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
                            <MapPin size={18} /> Contact & Address
                        </h3>
                        <div className="space-y-3">
                            <InfoRow label="Address" value={tenant.address || 'N/A'} icon={<MapPin size={14} />} />
                            <InfoRow label="City" value={tenant.city || 'N/A'} />
                            <InfoRow label="State" value={tenant.state || 'N/A'} />
                            <InfoRow label="Pincode" value={tenant.pincode ? String(tenant.pincode) : 'N/A'} />
                            <InfoRow label="Phone" value={tenant.phone ? String(tenant.phone) : 'N/A'} icon={<Phone size={14} />} />
                            <InfoRow label="Email" value={tenant.email || 'N/A'} icon={<Mail size={14} />} />
                            <InfoRow label="Website" value={tenant.website || 'N/A'} icon={<Globe size={14} />} link={tenant.website} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Edit College"
                size="xl"
            >
                <Form method="post" className="space-y-5">
                    <input type="hidden" name="intent" value="updateTenant" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">College Name</label>
                            <input
                                type="text"
                                name="collegeName"
                                defaultValue={tenant.collegeName as string}
                                className="form-input"
                            />
                        </div>
                        <div>
                            <label className="form-label">College ID</label>
                            <input
                                type="text"
                                value={tenant.collegeId as string}
                                disabled
                                className="form-input bg-surface-100 text-surface-400 cursor-not-allowed"
                            />
                            <p className="text-xs text-surface-400 mt-1">Cannot be changed</p>
                        </div>
                        <div className="md:col-span-2">
                            <label className="form-label">Address</label>
                            <input
                                type="text"
                                name="address"
                                defaultValue={tenant.address as string}
                                className="form-input"
                            />
                        </div>
                        <div>
                            <label className="form-label">City</label>
                            <input type="text" name="city" defaultValue={tenant.city as string} className="form-input" />
                        </div>
                        <div>
                            <label className="form-label">State</label>
                            <input type="text" name="state" defaultValue={tenant.state as string} className="form-input" />
                        </div>
                        <div>
                            <label className="form-label">Pincode</label>
                            <input type="number" name="pincode" defaultValue={tenant.pincode as number} className="form-input" />
                        </div>
                        <div>
                            <label className="form-label">Phone</label>
                            <input type="number" name="phone" defaultValue={tenant.phone as number} className="form-input" />
                        </div>
                        <div>
                            <label className="form-label">Email</label>
                            <input type="email" name="email" defaultValue={tenant.email as string} className="form-input" />
                        </div>
                        <div>
                            <label className="form-label">Website</label>
                            <input type="url" name="website" defaultValue={tenant.website as string} className="form-input" />
                        </div>
                        <div>
                            <label className="form-label">Established Year</label>
                            <input type="number" name="establishedYear" defaultValue={tenant.establishedYear as number} className="form-input" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                        <Button variant="ghost" type="button" onClick={() => setShowEditModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            Save Changes
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}

/* ── Clickable Stat Card ── */
function ClickableStat({
    label, value, icon, color, active, onClick,
}: {
    label: string; value: string | number; icon: React.ReactNode;
    color: string; active: boolean; onClick: () => void;
}) {
    const colorMap: Record<string, { text: string; bg: string }> = {
        primary: { text: 'text-primary-700', bg: 'bg-primary-50' },
        emerald: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
        violet: { text: 'text-violet-700', bg: 'bg-violet-50' },
        amber: { text: 'text-amber-700', bg: 'bg-amber-50' },
        sky: { text: 'text-sky-700', bg: 'bg-sky-50' },
        rose: { text: 'text-rose-700', bg: 'bg-rose-50' },
    };
    const c = colorMap[color] || colorMap.primary;

    return (
        <button
            onClick={onClick}
            className={`
                p-4 rounded-2xl border-2 transition-all duration-200 text-left w-full cursor-pointer
                ${active
                    ? `border-current ${c.text} ${c.bg} shadow-lg scale-[1.02]`
                    : 'border-transparent bg-white shadow-sm hover:shadow-md hover:scale-[1.01]'
                }
            `}
        >
            <div className={`p-2 rounded-lg ${c.bg} ${c.text} w-fit mb-2`}>
                {icon}
            </div>
            <p className="text-2xl font-bold text-surface-900">{value}</p>
            <p className="text-xs font-medium text-surface-500 mt-0.5">{label}</p>
        </button>
    );
}

/* ── Generic Data Table ── */
function DataTable({
    columns, rows, emptyMessage,
}: {
    columns: string[]; rows: string[][]; emptyMessage: string;
}) {
    if (rows.length === 0) {
        return (
            <div className="text-center py-10">
                <p className="text-sm text-surface-400">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-surface-100">
                        {columns.map((col) => (
                            <th key={col} className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                            {row.map((cell, j) => (
                                <td key={j} className="py-3 px-4 text-sm text-surface-700">
                                    {columns[j]?.toLowerCase() === 'status' ? (
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            cell === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                            cell === 'placed' ? 'bg-primary-100 text-primary-700' :
                                            cell === 'blocked' || cell === 'inactive' ? 'bg-rose-100 text-rose-700' :
                                            'bg-surface-100 text-surface-600'
                                        }`}>
                                            {cell}
                                        </span>
                                    ) : columns[j]?.toLowerCase() === 'role' ? (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 font-medium capitalize">
                                            {cell}
                                        </span>
                                    ) : (
                                        cell || '-'
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="text-xs text-surface-400 mt-3 px-4">
                Showing {rows.length} record{rows.length !== 1 ? 's' : ''}
            </p>
        </div>
    );
}

/* ── Info Row ── */
function InfoRow({ label, value, icon, link }: { label: string; value: string; icon?: React.ReactNode; link?: string }) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-surface-50 last:border-0">
            <span className="text-sm text-surface-500 flex items-center gap-1.5">
                {icon} {label}
            </span>
            {link ? (
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline">
                    {value}
                </a>
            ) : (
                <span className="text-sm font-medium text-surface-800">{value}</span>
            )}
        </div>
    );
}