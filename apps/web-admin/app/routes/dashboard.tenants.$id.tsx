import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
    ArrowLeft,
    Briefcase,
    Building2,
    Calendar,
    CheckCircle2,
    Edit,
    FileText,
    Globe,
    GraduationCap,
    Mail,
    MapPin,
    Phone,
    Plus,
    Shield,
    Trash2,
    TrendingUp,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { Button, Card, Modal } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useActionData, useLoaderData, Link, Form, useNavigation, useParams } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [
    { title: 'College Details - Super Admin - CareerNest' },
];

type TenantActionResponse = {
    success: boolean;
    intent?: 'updateTenant' | 'createDepartment' | 'deleteDepartment';
    message?: string;
    error?: string;
};

export async function loader({ request, params }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const tenantId = params.id!;

    try {
        const [tenantRes, companiesRes, drivesRes, placementsRes, teamRes, departmentsRes, studentsRes] = await Promise.all([
            api.tenants.getById(token, tenantId) as Promise<{ data: Record<string, unknown> }>,
            api.admin.listCompanies(token, `tenantId=${tenantId}&limit=100`) as Promise<{ data: Array<Record<string, unknown>>; total: number }>,
            api.admin.listDrives(token, `tenantId=${tenantId}&limit=100`) as Promise<{ data: Array<Record<string, unknown>>; total: number }>,
            api.admin.listPlacements(token, `tenantId=${tenantId}&limit=100`) as Promise<{ data: Array<Record<string, unknown>>; total: number }>,
            api.tenants.getTeamMembers(token, tenantId).catch(() => ({ data: { teamId: null, members: [] } })) as Promise<{ data: { teamId: string | null; members: Array<Record<string, unknown>> } }>,
            api.tenants.listDepartments(token, tenantId).catch(() => ({ data: [] })) as Promise<{ data: Array<Record<string, unknown>> }>,
            api.tenants.listStudents(token, tenantId, 'limit=1').catch(() => ({ data: [], total: 0 })) as Promise<{ data: Array<Record<string, unknown>>; total: number }>,
        ]);

        const companies = companiesRes.data || [];
        const drives = drivesRes.data || [];
        const placements = placementsRes.data || [];
        const teamData = teamRes.data || { teamId: null, members: [] };
        const teamMembers = (teamData.members || []) as Array<Record<string, unknown>>;
        const departments = (departmentsRes.data || []) as Array<Record<string, unknown>>;

        const roleCounts = teamMembers.reduce((acc: Record<string, number>, member: Record<string, unknown>) => {
            const roles = (member.roles as string[]) || [];
            for (const role of roles) {
                if (role === 'owner') continue;
                acc[role] = (acc[role] || 0) + 1;
            }
            return acc;
        }, {});

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
            departments,
            studentsCount: studentsRes.total || 0,
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
        for (const field of fields) {
            const value = formData.get(field) as string;
            if (value) data[field] = value;
        }
        const pincode = formData.get('pincode') as string;
        if (pincode) data.pincode = parseInt(pincode, 10);
        const phone = formData.get('phone') as string;
        if (phone) data.phone = parseInt(phone, 10);
        const year = formData.get('establishedYear') as string;
        if (year) data.establishedYear = parseInt(year, 10);

        try {
            await api.tenants.update(token, params.id!, data);
            return json<TenantActionResponse>({ success: true, intent: 'updateTenant', message: 'College updated' });
        } catch (error: unknown) {
            const err = error as { message?: string };
            return json<TenantActionResponse>({ success: false, intent: 'updateTenant', error: err.message }, { status: 400 });
        }
    }

    if (intent === 'createDepartment') {
        const departmentName = (formData.get('departmentName') as string || '').trim();
        const departmentHeadName = (formData.get('departmentHeadName') as string || '').trim();
        const departmentHeadEmail = (formData.get('departmentHeadEmail') as string || '').trim().toLowerCase();
        const departmentHeadPassword = (formData.get('departmentHeadPassword') as string || '');

        if (!departmentName || !departmentHeadName || !departmentHeadEmail || !departmentHeadPassword) {
            return json<TenantActionResponse>({
                success: false,
                intent: 'createDepartment',
                error: 'Department name, head name, email and password are required',
            }, { status: 400 });
        }

        try {
            await api.tenants.createDepartment(token, params.id!, {
                departmentName,
                departmentHeadName,
                departmentHeadEmail,
                departmentHeadPassword,
            });
            return json<TenantActionResponse>({ success: true, intent: 'createDepartment', message: 'Department created' });
        } catch (error: unknown) {
            const err = error as { message?: string };
            return json<TenantActionResponse>({
                success: false,
                intent: 'createDepartment',
                error: err.message || 'Failed to create department',
            }, { status: 400 });
        }
    }

    if (intent === 'deleteDepartment') {
        const departmentId = formData.get('departmentId') as string;

        try {
            await api.tenants.deleteDepartment(token, params.id!, departmentId);
            return json<TenantActionResponse>({ success: true, intent: 'deleteDepartment', message: 'Department deleted' });
        } catch (error: unknown) {
            const err = error as { message?: string };
            return json<TenantActionResponse>({
                success: false,
                intent: 'deleteDepartment',
                error: err.message || 'Failed to delete department',
            }, { status: 400 });
        }
    }

    return json<TenantActionResponse>({ success: false, error: 'Invalid action' }, { status: 400 });
}

export default function TenantDetail() {
    const {
        tenant,
        companies,
        drives,
        placements,
        teamMembers,
        totalMembers,
        totalCompanies,
        totalDrives,
        totalPlacements,
        departments,
        studentsCount,
        roleCounts,
        placedCount,
        placementRate,
    } = useLoaderData<typeof loader>() as any;
    const actionData = useActionData<typeof action>() as TenantActionResponse | undefined;
    const params = useParams();
    const navigation = useNavigation();

    const tenantId = String(tenant.$id || '');
    const tenantRouteId = tenantId || params.id || '';
    const registeredAt = tenant.$createdAt
        ? new Date(tenant.$createdAt as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A';
    const lastUpdatedAt = tenant.$updatedAt
        ? new Date(tenant.$updatedAt as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A';
    const locationText = [tenant.city, tenant.state].filter(Boolean).join(', ') || 'Location unavailable';

    const activeIntent = navigation.formData?.get('intent');
    const isSubmitting = navigation.state === 'submitting';
    const isSavingTenant = isSubmitting && activeIntent === 'updateTenant';
    const isCreatingDepartment = isSubmitting && activeIntent === 'createDepartment';
    const deletingDepartmentId = isSubmitting && activeIntent === 'deleteDepartment'
        ? String(navigation.formData?.get('departmentId') || '')
        : '';

    const [showEditModal, setShowEditModal] = useState(false);
    const [showCreateDepartmentModal, setShowCreateDepartmentModal] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    useEffect(() => {
        if (!actionData?.success) return;

        if (actionData.intent === 'updateTenant') {
            setShowEditModal(false);
        }

        if (actionData.intent === 'createDepartment') {
            setShowCreateDepartmentModal(false);
        }
    }, [actionData]);

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                        <Link
                            to="/dashboard/tenants"
                            className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800"
                        >
                            <ArrowLeft size={16} />
                            Back to colleges
                        </Link>

                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900">
                                {String(tenant.collegeName || 'Unnamed College')}
                            </h1>
                            <p className="mt-1 text-sm text-slate-600">
                                College ID: {String(tenant.collegeId || 'N/A')}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                            <span>{locationText}</span>
                            <span>Registered: {registeredAt}</span>
                            <span>Updated: {lastUpdatedAt}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button variant="secondary" onClick={() => setShowEditModal(true)}>
                            <Edit size={16} />
                            Edit College
                        </Button>
                        <Button onClick={() => setShowCreateDepartmentModal(true)}>
                            <Plus size={16} />
                            Add Department
                        </Button>
                        <Link
                            to="/dashboard/users?action=create"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            <UserPlus size={16} />
                            Add Admin
                        </Link>
                    </div>
                </div>
            </div>

            {actionData?.message || actionData?.error ? (
                <FeedbackBanner
                    success={Boolean(actionData.success)}
                    message={actionData.error || actionData.message || ''}
                />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <StatButton
                    label="Team Members"
                    value={totalMembers}
                    icon={<Users size={18} />}
                    active={expandedSection === 'members'}
                    onClick={() => toggleSection('members')}
                />
                <StatButton
                    label="Placements"
                    value={totalPlacements}
                    icon={<CheckCircle2 size={18} />}
                    active={expandedSection === 'placements'}
                    onClick={() => toggleSection('placements')}
                />
                <StatButton
                    label="Companies"
                    value={totalCompanies}
                    icon={<Briefcase size={18} />}
                    active={expandedSection === 'companies'}
                    onClick={() => toggleSection('companies')}
                />
                <StatButton
                    label="Drives"
                    value={totalDrives}
                    icon={<FileText size={18} />}
                    active={expandedSection === 'drives'}
                    onClick={() => toggleSection('drives')}
                />
                <StatButton
                    label="Roles"
                    value={Object.keys(roleCounts).length}
                    icon={<Shield size={18} />}
                    active={expandedSection === 'roles'}
                    onClick={() => toggleSection('roles')}
                />
                <StatButton
                    label="Placement Rate"
                    value={`${placementRate}%`}
                    icon={<TrendingUp size={18} />}
                    active={expandedSection === 'analytics'}
                    onClick={() => toggleSection('analytics')}
                />
            </div>

            {expandedSection ? (
                <Card className="p-0">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-semibold text-slate-900">
                            {expandedSection === 'analytics' ? 'Placement Analytics' : sectionTitle(expandedSection)}
                        </h2>
                        <button
                            type="button"
                            onClick={() => setExpandedSection(null)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-6">
                        {expandedSection === 'members' && (
                            <DataTable
                                columns={['Name', 'Email', 'Roles', 'Joined']}
                                rows={teamMembers.map((member: any) => [
                                    member.userName || '-',
                                    member.userEmail || '-',
                                    (member.roles || []).filter((role: string) => role !== 'owner').join(', ').toUpperCase() || '-',
                                    member.joined ? new Date(member.joined).toLocaleDateString() : '-',
                                ])}
                                emptyMessage="No team members in this college."
                            />
                        )}

                        {expandedSection === 'placements' && (
                            <DataTable
                                columns={['Student ID', 'Drive ID', 'Company ID', 'CTC Offered', 'Placed At']}
                                rows={placements.map((placement: any) => [
                                    placement.studentId || '-',
                                    placement.driveId || '-',
                                    placement.companyId || '-',
                                    placement.ctcOffered ? `₹${Number(placement.ctcOffered).toLocaleString('en-IN')} LPA` : '-',
                                    placement.placedAt ? new Date(placement.placedAt).toLocaleDateString() : '-',
                                ])}
                                emptyMessage="No placements recorded yet."
                            />
                        )}

                        {expandedSection === 'companies' && (
                            <DataTable
                                columns={['Name', 'Contact Person', 'Email', 'Phone', 'Status']}
                                rows={companies.map((company: any) => [
                                    company.name || '-',
                                    company.contactPerson || '-',
                                    company.contactEmail || '-',
                                    company.contactPhone || '-',
                                    company.status || '-',
                                ])}
                                emptyMessage="No companies registered yet."
                            />
                        )}

                        {expandedSection === 'drives' && (
                            <DataTable
                                columns={['Job Role', 'Company ID', 'CTC', 'Deadline', 'Status']}
                                rows={drives.map((drive: any) => [
                                    drive.jobRole || '-',
                                    drive.companyId || '-',
                                    drive.CTC ? `₹${Number(drive.CTC).toLocaleString('en-IN')} LPA` : '-',
                                    drive.deadline ? new Date(drive.deadline).toLocaleDateString() : '-',
                                    drive.status || '-',
                                ])}
                                emptyMessage="No placement drives yet."
                            />
                        )}

                        {expandedSection === 'roles' && (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {Object.entries(roleCounts as Record<string, number>).length > 0 ? (
                                    Object.entries(roleCounts as Record<string, number>).map(([role, count]) => (
                                        <div key={role} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <p className="text-sm text-slate-600 capitalize">{role.replace(/_/g, ' ')}</p>
                                            <p className="mt-2 text-2xl font-semibold text-slate-900">{count}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="col-span-full text-sm text-slate-500">No roles assigned yet.</p>
                                )}
                            </div>
                        )}

                        {expandedSection === 'analytics' && (
                            <div className="grid gap-4 md:grid-cols-3">
                                <MetricCard label="Team Members" value={String(totalMembers)} />
                                <MetricCard label="Placed Students" value={String(placedCount)} />
                                <MetricCard label="Placement Rate" value={`${placementRate}%`} />
                            </div>
                        )}
                    </div>
                </Card>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-3">
                <Card className="xl:col-span-2 p-0">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Departments</h2>
                            <p className="mt-1 text-sm text-slate-600">
                                Create and manage departments for this college.
                            </p>
                        </div>
                        <Button onClick={() => setShowCreateDepartmentModal(true)}>
                            <Plus size={16} />
                            Add Department
                        </Button>
                    </div>

                    <div className="p-6">
                        {departments.length > 0 ? (
                            <div className="space-y-3">
                                {departments.map((department: Record<string, unknown>) => {
                                    const departmentId = String(department.$id || '');

                                    return (
                                        <div
                                            key={String(department.$id || department.departmentName)}
                                            className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">
                                                    {String(department.departmentName || 'Unnamed Department')}
                                                </p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    Department is active for this college.
                                                </p>
                                            </div>
                                            {departmentId ? (
                                                <Form method="post">
                                                    <input type="hidden" name="intent" value="deleteDepartment" />
                                                    <input type="hidden" name="departmentId" value={departmentId} />
                                                    <button
                                                        type="submit"
                                                        disabled={deletingDepartmentId === departmentId}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        <Trash2 size={15} />
                                                        {deletingDepartmentId === departmentId ? 'Removing...' : 'Remove'}
                                                    </button>
                                                </Form>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                                <Building2 size={28} className="mx-auto text-slate-300" />
                                <h3 className="mt-3 text-base font-semibold text-slate-900">No departments added yet</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Use the add department popup to create the first department.
                                </p>
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="p-0">
                    <div className="border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-semibold text-slate-900">Students</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Open the student directory for this college.
                        </p>
                    </div>

                    <div className="space-y-4 p-6">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm text-slate-600">Total students</p>
                            <p className="mt-2 text-3xl font-semibold text-slate-900">{studentsCount}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <MetricCard label="Departments" value={String(departments.length)} compact />
                            <MetricCard label="Team Members" value={String(totalMembers)} compact />
                        </div>

                        <Link
                            to={`/dashboard/tenants/${tenantRouteId}/students`}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700"
                        >
                            <GraduationCap size={16} />
                            View Students
                        </Link>
                    </div>
                </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <Card className="p-0">
                    <div className="border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-semibold text-slate-900">College Information</h2>
                    </div>
                    <div className="p-6">
                        <InfoRow label="College Name" value={String(tenant.collegeName || 'N/A')} />
                        <InfoRow label="College ID" value={String(tenant.collegeId || 'N/A')} />
                        <InfoRow label="Established" value={tenant.establishedYear ? String(tenant.establishedYear) : 'N/A'} icon={<Calendar size={14} />} />
                        <InfoRow label="Created" value={registeredAt} />
                        <InfoRow label="Last Updated" value={lastUpdatedAt} />
                    </div>
                </Card>

                <Card className="p-0">
                    <div className="border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-semibold text-slate-900">Contact & Address</h2>
                    </div>
                    <div className="p-6">
                        <InfoRow label="Address" value={String(tenant.address || 'N/A')} icon={<MapPin size={14} />} />
                        <InfoRow label="City" value={String(tenant.city || 'N/A')} />
                        <InfoRow label="State" value={String(tenant.state || 'N/A')} />
                        <InfoRow label="Pincode" value={tenant.pincode ? String(tenant.pincode) : 'N/A'} />
                        <InfoRow label="Phone" value={tenant.phone ? String(tenant.phone) : 'N/A'} icon={<Phone size={14} />} />
                        <InfoRow label="Email" value={String(tenant.email || 'N/A')} icon={<Mail size={14} />} />
                        <InfoRow label="Website" value={String(tenant.website || 'N/A')} icon={<Globe size={14} />} link={tenant.website ? String(tenant.website) : undefined} />
                    </div>
                </Card>
            </div>

            <Modal
                isOpen={showCreateDepartmentModal}
                onClose={() => setShowCreateDepartmentModal(false)}
                title="Add Department"
                size="lg"
            >
                <Form method="post" className="space-y-5">
                    <input type="hidden" name="intent" value="createDepartment" />

                    {actionData?.intent === 'createDepartment' && actionData.error ? (
                        <FeedbackBanner success={false} message={actionData.error} compact />
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Department Name">
                            <input
                                type="text"
                                name="departmentName"
                                required
                                autoFocus
                                placeholder="Computer Science and Engineering"
                                className="form-input"
                            />
                        </Field>

                        <Field label="Department Head Name">
                            <input
                                type="text"
                                name="departmentHeadName"
                                required
                                placeholder="Dr. Neha Sharma"
                                className="form-input"
                            />
                        </Field>

                        <Field label="Department Head Email">
                            <input
                                type="email"
                                name="departmentHeadEmail"
                                required
                                placeholder="cse.head@college.edu"
                                className="form-input"
                            />
                        </Field>

                        <Field label="Temporary Password">
                            <input
                                type="password"
                                name="departmentHeadPassword"
                                required
                                minLength={8}
                                placeholder="Minimum 8 characters"
                                className="form-input"
                            />
                        </Field>
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                        <Button variant="ghost" type="button" onClick={() => setShowCreateDepartmentModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isCreatingDepartment}>
                            Add Department
                        </Button>
                    </div>
                </Form>
            </Modal>

            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Edit College"
                size="xl"
            >
                <Form method="post" className="space-y-5">
                    <input type="hidden" name="intent" value="updateTenant" />

                    {actionData?.intent === 'updateTenant' && actionData.error ? (
                        <FeedbackBanner success={false} message={actionData.error} compact />
                    ) : null}

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Field label="College Name">
                            <input
                                type="text"
                                name="collegeName"
                                defaultValue={tenant.collegeName as string}
                                className="form-input"
                            />
                        </Field>

                        <Field label="College ID">
                            <input
                                type="text"
                                value={tenant.collegeId as string}
                                disabled
                                className="form-input cursor-not-allowed bg-slate-100 text-slate-500"
                            />
                        </Field>

                        <Field label="Address" className="lg:col-span-2">
                            <input
                                type="text"
                                name="address"
                                defaultValue={tenant.address as string}
                                className="form-input"
                            />
                        </Field>

                        <Field label="City">
                            <input
                                type="text"
                                name="city"
                                defaultValue={tenant.city as string}
                                className="form-input"
                            />
                        </Field>

                        <Field label="State">
                            <input
                                type="text"
                                name="state"
                                defaultValue={tenant.state as string}
                                className="form-input"
                            />
                        </Field>

                        <Field label="Pincode">
                            <input
                                type="number"
                                name="pincode"
                                defaultValue={tenant.pincode as number}
                                className="form-input"
                            />
                        </Field>

                        <Field label="Phone">
                            <input
                                type="number"
                                name="phone"
                                defaultValue={tenant.phone as number}
                                className="form-input"
                            />
                        </Field>

                        <Field label="Email">
                            <input
                                type="email"
                                name="email"
                                defaultValue={tenant.email as string}
                                className="form-input"
                            />
                        </Field>

                        <Field label="Website">
                            <input
                                type="url"
                                name="website"
                                defaultValue={tenant.website as string}
                                className="form-input"
                            />
                        </Field>

                        <Field label="Established Year">
                            <input
                                type="number"
                                name="establishedYear"
                                defaultValue={tenant.establishedYear as number}
                                className="form-input"
                            />
                        </Field>
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                        <Button variant="ghost" type="button" onClick={() => setShowEditModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSavingTenant}>
                            Save Changes
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}

function sectionTitle(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function StatButton({
    label,
    value,
    icon,
    active,
    onClick,
}: {
    label: string;
    value: string | number;
    icon: ReactNode;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'rounded-xl border p-4 text-left transition',
                active
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
            ].join(' ')}
        >
            <div className="flex items-center justify-between">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-700">{icon}</div>
                <span className="text-2xl font-semibold text-slate-900">{value}</span>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">{label}</p>
        </button>
    );
}

function DataTable({
    columns,
    rows,
    emptyMessage,
}: {
    columns: string[];
    rows: string[][];
    emptyMessage: string;
}) {
    if (rows.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] bg-white">
                    <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200">
                            {columns.map((column) => (
                                <th
                                    key={column}
                                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
                                >
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-slate-100 last:border-0">
                                {row.map((cell, columnIndex) => (
                                    <td key={columnIndex} className="px-4 py-3 text-sm text-slate-700">
                                        {columns[columnIndex]?.toLowerCase() === 'status' ? (
                                            <span className={[
                                                'inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                                                cell === 'active'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : cell === 'placed'
                                                        ? 'bg-primary-100 text-primary-700'
                                                        : cell === 'blocked' || cell === 'inactive'
                                                            ? 'bg-rose-100 text-rose-700'
                                                            : 'bg-slate-100 text-slate-700',
                                            ].join(' ')}>
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
            </div>
        </div>
    );
}

function MetricCard({
    label,
    value,
    compact = false,
}: {
    label: string;
    value: string;
    compact?: boolean;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">{label}</p>
            <p className={`mt-2 font-semibold text-slate-900 ${compact ? 'text-xl' : 'text-2xl'}`}>{value}</p>
        </div>
    );
}

function FeedbackBanner({
    success,
    message,
    compact = false,
}: {
    success: boolean;
    message: string;
    compact?: boolean;
}) {
    return (
        <div
            className={[
                'rounded-lg border px-4 py-3 text-sm',
                success
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800',
                compact ? '' : 'shadow-sm',
            ].join(' ')}
        >
            {message}
        </div>
    );
}

function Field({
    label,
    hint,
    className,
    children,
}: {
    label: string;
    hint?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={className}>
            <label className="form-label">{label}</label>
            {children}
            {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
    );
}

function InfoRow({
    label,
    value,
    icon,
    link,
}: {
    label: string;
    value: string;
    icon?: ReactNode;
    link?: string;
}) {
    return (
        <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                {icon}
                {label}
            </span>
            {link ? (
                <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary-700 hover:underline"
                >
                    {value}
                </a>
            ) : (
                <span className="text-sm font-medium text-slate-900">{value}</span>
            )}
        </div>
    );
}
