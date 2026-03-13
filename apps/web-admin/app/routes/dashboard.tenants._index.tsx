import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
    BookOpen,
    Building2,
    Check,
    ChevronRight,
    Eye,
    Plus,
    Shield,
    Trash2,
    UserPlus,
} from 'lucide-react';
import { Button, Card, Modal } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useActionData, useLoaderData, useSearchParams, Form, useNavigation, Link } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Colleges - Super Admin - CareerNest' }];

type TenantCreateActionResponse = {
    success: boolean;
    intent?: 'create';
    message?: string;
    error?: string;
};

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
            page: parseInt(page, 10),
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
        const admins: Array<{ name: string; email: string; password: string; role: string }> = [];
        let aIdx = 0;
        while (formData.get(`admins[${aIdx}].name`)) {
            admins.push({
                name: formData.get(`admins[${aIdx}].name`) as string,
                email: formData.get(`admins[${aIdx}].email`) as string,
                password: formData.get(`admins[${aIdx}].password`) as string,
                role: formData.get(`admins[${aIdx}].role`) as string,
            });
            aIdx++;
        }

        const departments: Array<{ name: string; headName: string; headEmail: string; headPassword: string }> = [];
        let dIdx = 0;
        while (formData.get(`departments[${dIdx}].name`)) {
            departments.push({
                name: formData.get(`departments[${dIdx}].name`) as string,
                headName: formData.get(`departments[${dIdx}].headName`) as string,
                headEmail: formData.get(`departments[${dIdx}].headEmail`) as string,
                headPassword: formData.get(`departments[${dIdx}].headPassword`) as string,
            });
            dIdx++;
        }

        const data: Record<string, unknown> = {
            collegeId: formData.get('collegeId') as string,
            tag: (formData.get('tag') as string)?.trim().toLowerCase(),
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
            const response = await api.tenants.create(token, data) as any;
            const tenantId = response?.data?.$id as string | undefined;

            if (departments.length > 0 && tenantId) {
                for (const dept of departments) {
                    try {
                        await api.tenants.createDepartment(token, tenantId, {
                            departmentName: dept.name,
                            departmentHeadName: dept.headName,
                            departmentHeadEmail: dept.headEmail,
                            departmentHeadPassword: dept.headPassword,
                        });
                    } catch (deptErr) {
                        console.error(`Failed to create department "${dept.name}":`, deptErr);
                    }
                }
            }

            return json<TenantCreateActionResponse>({
                success: true,
                intent: 'create',
                message: 'College created successfully',
            });
        } catch (error: unknown) {
            const err = error as { message?: string };
            return json<TenantCreateActionResponse>({
                success: false,
                intent: 'create',
                error: err.message || 'Failed to create college',
            }, { status: 400 });
        }
    }

    return json<TenantCreateActionResponse>({
        success: false,
        error: 'Invalid action',
    }, { status: 400 });
}

type CollegeFormData = {
    collegeName: string; collegeId: string; tag: string; establishedYear: string;
    address: string; city: string; state: string; pincode: string; phone: string; email: string; website: string;
};
type AdminEntry = { name: string; email: string; password: string; role: string };
type DeptEntry = { name: string; headName: string; headEmail: string; headPassword: string };

const EMPTY_COLLEGE: CollegeFormData = {
    collegeName: '', collegeId: '', tag: '', establishedYear: '',
    address: '', city: '', state: '', pincode: '', phone: '', email: '', website: '',
};
const WIZARD_STEPS = ['College Info', 'Add Admin', 'Add Departments'];

export default function AdminTenants() {
    const { tenants, total, page, limit } = useLoaderData<typeof loader>() as any;
    const actionData = useActionData<typeof action>() as TenantCreateActionResponse | undefined;
    const [searchParams] = useSearchParams();
    const navigation = useNavigation();

    const isSubmitting = navigation.state === 'submitting';
    const isCreating = isSubmitting && navigation.formData?.get('intent') === 'create';
    const totalPages = Math.ceil(total / limit);

    const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'create');
    const [step, setStep] = useState(1);
    const [college, setCollege] = useState<CollegeFormData>(EMPTY_COLLEGE);
    const [admins, setAdmins] = useState<AdminEntry[]>([]);
    const [depts, setDepts] = useState<DeptEntry[]>([]);

    const resetWizard = () => {
        setStep(1);
        setCollege(EMPTY_COLLEGE);
        setAdmins([]);
        setDepts([]);
    };

    useEffect(() => {
        if (actionData?.success && actionData.intent === 'create') {
            setShowCreateModal(false);
            resetWizard();
        }
    }, [actionData]);

    const handleCloseModal = () => { setShowCreateModal(false); resetWizard(); };

    const updateCollege = (field: keyof CollegeFormData, value: string) =>
        setCollege(prev => ({ ...prev, [field]: value }));

    const addAdmin = () => setAdmins(c => [...c, { name: '', email: '', password: '', role: 'tpo' }]);
    const removeAdmin = (i: number) => setAdmins(c => c.filter((_, idx) => idx !== i));
    const updateAdmin = (i: number, field: string, value: string) =>
        setAdmins(c => c.map((a, idx) => idx === i ? { ...a, [field]: value } : a));

    const addDept = () => setDepts(c => [...c, { name: '', headName: '', headEmail: '', headPassword: '' }]);
    const removeDept = (i: number) => setDepts(c => c.filter((_, idx) => idx !== i));
    const updateDept = (i: number, field: string, value: string) =>
        setDepts(c => c.map((d, idx) => idx === i ? { ...d, [field]: value } : d));

    const step1Valid = (Object.values(college) as string[]).every(v => v.trim() !== '');

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Colleges</h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Manage colleges registered on the platform.
                    </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus size={16} />
                    Add College
                </Button>
            </div>

            {actionData?.message || actionData?.error ? (
                <div
                    className={[
                        'rounded-lg border px-4 py-3 text-sm',
                        actionData.success
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-rose-200 bg-rose-50 text-rose-800',
                    ].join(' ')}
                >
                    {actionData.error || actionData.message}
                </div>
            ) : null}

            {tenants.length > 0 ? (
                <Card className="p-0">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-semibold text-slate-900">College List</h2>
                        <p className="text-sm text-slate-500">
                            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] bg-white">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200">
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">College ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">College Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Created</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.map((tenant: Record<string, unknown>) => (
                                    <tr key={tenant.$id as string} className="border-b border-slate-100 last:border-0">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex rounded-md bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                                                {tenant.collegeId as string}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
                                                    {(tenant.collegeName as string)?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <Link
                                                        to={`/dashboard/tenants/${tenant.$id}`}
                                                        className="text-sm font-medium text-slate-900 hover:text-primary-700"
                                                    >
                                                        {tenant.collegeName as string}
                                                    </Link>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        Open college details
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {tenant.$createdAt
                                                ? new Date(tenant.$createdAt as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                to={`/dashboard/tenants/${tenant.$id}`}
                                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                            >
                                                <Eye size={15} />
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                            <p className="text-sm text-slate-500">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                {page > 1 && (
                                    <Link
                                        to={`?page=${page - 1}`}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        Previous
                                    </Link>
                                )}
                                {page < totalPages && (
                                    <Link
                                        to={`?page=${page + 1}`}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
                    <div className="py-12 text-center">
                        <Building2 size={32} className="mx-auto text-slate-300" />
                        <h2 className="mt-4 text-lg font-semibold text-slate-900">No colleges found</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Add the first college to get started.
                        </p>
                    </div>
                </Card>
            )}

            <Modal
                isOpen={showCreateModal}
                onClose={handleCloseModal}
                title="Add New College"
                size="xl"
            >
                {/* Step indicator */}
                <div className="mb-6 flex items-center justify-center">
                    {WIZARD_STEPS.map((label, i) => (
                        <div key={label} className="flex items-center">
                            <div className="flex items-center gap-2">
                                <div className={[
                                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all',
                                    i + 1 < step ? 'bg-primary-600 text-white' :
                                    i + 1 === step ? 'bg-primary-600 text-white ring-4 ring-primary-100' :
                                    'bg-slate-100 text-slate-500',
                                ].join(' ')}>
                                    {i + 1 < step ? <Check size={12} /> : i + 1}
                                </div>
                                <span className={`text-sm font-medium ${i + 1 <= step ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {label}
                                </span>
                            </div>
                            {i < WIZARD_STEPS.length - 1 && (
                                <ChevronRight size={14} className={`mx-3 ${i + 1 < step ? 'text-primary-400' : 'text-slate-300'}`} />
                            )}
                        </div>
                    ))}
                </div>

                <Form method="post" className="space-y-5">
                    <input type="hidden" name="intent" value="create" />

                    {/* Hidden college data for steps 2 & 3 */}
                    {step >= 2 && (Object.entries(college) as [string, string][]).map(([key, val]) => (
                        <input key={key} type="hidden" name={key} value={val} />
                    ))}

                    {/* Hidden admin data for step 3 */}
                    {step === 3 && admins.flatMap((admin, i) => [
                        <input key={`a${i}n`} type="hidden" name={`admins[${i}].name`} value={admin.name} />,
                        <input key={`a${i}e`} type="hidden" name={`admins[${i}].email`} value={admin.email} />,
                        <input key={`a${i}p`} type="hidden" name={`admins[${i}].password`} value={admin.password} />,
                        <input key={`a${i}r`} type="hidden" name={`admins[${i}].role`} value={admin.role} />,
                    ])}

                    {actionData?.intent === 'create' && actionData.error ? (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                            {actionData.error}
                        </div>
                    ) : null}

                    {/* ── Step 1: College Info ── */}
                    {step === 1 && (
                        <div className="grid gap-5 lg:grid-cols-2">
                            <SectionCard title="Basic Information">
                                <Field label="College Name *">
                                    <input
                                        type="text"
                                        required
                                        value={college.collegeName}
                                        onChange={e => updateCollege('collegeName', e.target.value)}
                                        placeholder="Indian Institute of Technology, Delhi"
                                        className="form-input"
                                    />
                                </Field>
                                <Field label="College ID *">
                                    <input
                                        type="text"
                                        required
                                        value={college.collegeId}
                                        onChange={e => updateCollege('collegeId', e.target.value)}
                                        placeholder="IITD"
                                        className="form-input"
                                    />
                                </Field>
                                <Field label="Tag *" hint="Used in student login credentials.">
                                    <input
                                        type="text"
                                        required
                                        pattern="[A-Za-z0-9_-]+"
                                        value={college.tag}
                                        onChange={e => updateCollege('tag', e.target.value)}
                                        placeholder="pescoe"
                                        className="form-input"
                                    />
                                </Field>
                                <Field label="Established Year *">
                                    <input
                                        type="number"
                                        required
                                        value={college.establishedYear}
                                        onChange={e => updateCollege('establishedYear', e.target.value)}
                                        placeholder="1961"
                                        min={1800}
                                        max={new Date().getFullYear()}
                                        className="form-input"
                                    />
                                </Field>
                            </SectionCard>

                            <SectionCard title="Contact & Address">
                                <Field label="Address *" className="lg:col-span-2">
                                    <input
                                        type="text"
                                        required
                                        value={college.address}
                                        onChange={e => updateCollege('address', e.target.value)}
                                        placeholder="Hauz Khas, New Delhi"
                                        className="form-input"
                                    />
                                </Field>
                                <Field label="City *">
                                    <input type="text" required value={college.city} onChange={e => updateCollege('city', e.target.value)} placeholder="New Delhi" className="form-input" />
                                </Field>
                                <Field label="State *">
                                    <input type="text" required value={college.state} onChange={e => updateCollege('state', e.target.value)} placeholder="Delhi" className="form-input" />
                                </Field>
                                <Field label="Pincode *">
                                    <input type="number" required value={college.pincode} onChange={e => updateCollege('pincode', e.target.value)} placeholder="110016" className="form-input" />
                                </Field>
                                <Field label="Phone Number *">
                                    <input type="number" required value={college.phone} onChange={e => updateCollege('phone', e.target.value)} placeholder="1126591715" className="form-input" />
                                </Field>
                                <Field label="Email *">
                                    <input type="email" required value={college.email} onChange={e => updateCollege('email', e.target.value)} placeholder="tpo@iitd.ac.in" className="form-input" />
                                </Field>
                                <Field label="Website *">
                                    <input type="url" required value={college.website} onChange={e => updateCollege('website', e.target.value)} placeholder="https://iitd.ac.in" className="form-input" />
                                </Field>
                            </SectionCard>
                        </div>
                    )}

                    {/* ── Step 2: Add Admin ── */}
                    {step === 2 && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900">College Admins</h3>
                                    <p className="mt-1 text-sm text-slate-500">Add admins for this college. You can skip and do this later.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addAdmin}
                                    className="inline-flex items-center gap-2 rounded-lg border border-primary-300 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100"
                                >
                                    <UserPlus size={15} />
                                    Add Admin
                                </button>
                            </div>
                            {admins.length === 0 ? (
                                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                                    <Shield size={28} className="mx-auto text-slate-300" />
                                    <p className="mt-3 text-sm text-slate-500">No admins added yet. Click "Add Admin" or skip this step.</p>
                                </div>
                            ) : (
                                <div className="mt-4 space-y-4">
                                    {admins.map((admin, i) => (
                                        <div key={i} className="rounded-xl border border-slate-200 p-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-slate-900">Admin #{i + 1}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAdmin(i)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                                                >
                                                    <Trash2 size={14} />
                                                    Remove
                                                </button>
                                            </div>
                                            <div className="mt-4 grid gap-4 lg:grid-cols-4">
                                                <Field label="Name *">
                                                    <input type="text" value={admin.name} onChange={e => updateAdmin(i, 'name', e.target.value)} placeholder="Full name" className="form-input" />
                                                </Field>
                                                <Field label="Email *">
                                                    <input type="email" value={admin.email} onChange={e => updateAdmin(i, 'email', e.target.value)} placeholder="admin@college.edu" className="form-input" />
                                                </Field>
                                                <Field label="Password *">
                                                    <input type="password" minLength={8} value={admin.password} onChange={e => updateAdmin(i, 'password', e.target.value)} placeholder="Min 8 characters" className="form-input" />
                                                </Field>
                                                <Field label="Role *">
                                                    <select value={admin.role} onChange={e => updateAdmin(i, 'role', e.target.value)} className="form-input">
                                                        <option value="tpo">TPO</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </Field>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Step 3: Add Departments ── */}
                    {step === 3 && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900">Departments</h3>
                                    <p className="mt-1 text-sm text-slate-500">Add departments and their heads. You can skip and do this later.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addDept}
                                    className="inline-flex items-center gap-2 rounded-lg border border-primary-300 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100"
                                >
                                    <Plus size={15} />
                                    Add Department
                                </button>
                            </div>
                            {depts.length === 0 ? (
                                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                                    <BookOpen size={28} className="mx-auto text-slate-300" />
                                    <p className="mt-3 text-sm text-slate-500">No departments added yet. Click "Add Department" or create the college now.</p>
                                </div>
                            ) : (
                                <div className="mt-4 space-y-4">
                                    {depts.map((dept, i) => (
                                        <div key={i} className="rounded-xl border border-slate-200 p-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-slate-900">Department #{i + 1}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => removeDept(i)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                                                >
                                                    <Trash2 size={14} />
                                                    Remove
                                                </button>
                                            </div>
                                            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                                <Field label="Department Name *">
                                                    <input type="text" name={`departments[${i}].name`} required value={dept.name} onChange={e => updateDept(i, 'name', e.target.value)} placeholder="Computer Science" className="form-input" />
                                                </Field>
                                                <Field label="Head Name *">
                                                    <input type="text" name={`departments[${i}].headName`} required value={dept.headName} onChange={e => updateDept(i, 'headName', e.target.value)} placeholder="Dr. John Doe" className="form-input" />
                                                </Field>
                                                <Field label="Head Email *">
                                                    <input type="email" name={`departments[${i}].headEmail`} required value={dept.headEmail} onChange={e => updateDept(i, 'headEmail', e.target.value)} placeholder="head@college.edu" className="form-input" />
                                                </Field>
                                                <Field label="Head Password *">
                                                    <input type="password" name={`departments[${i}].headPassword`} required minLength={8} value={dept.headPassword} onChange={e => updateDept(i, 'headPassword', e.target.value)} placeholder="Min 8 characters" className="form-input" />
                                                </Field>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Wizard navigation */}
                    <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={step === 1 ? handleCloseModal : () => setStep(s => s - 1)}
                        >
                            {step === 1 ? 'Cancel' : '← Back'}
                        </Button>
                        <div className="flex items-center gap-3">
                            {step < 3 ? (
                                <>
                                    {step === 2 && (
                                        <Button variant="ghost" type="button" onClick={() => setStep(s => s + 1)}>
                                            Skip
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        onClick={() => setStep(s => s + 1)}
                                        disabled={step === 1 && !step1Valid}
                                    >
                                        Next →
                                    </Button>
                                </>
                            ) : (
                                <Button type="submit" isLoading={isCreating}>
                                    Create College
                                </Button>
                            )}
                        </div>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}


function SectionCard({
    title,
    children,
    fullWidth = false,
}: {
    title: string;
    children: ReactNode;
    fullWidth?: boolean;
}) {
    return (
        <div className={`rounded-xl border border-slate-200 bg-white p-5 ${fullWidth ? 'lg:col-span-2' : ''}`}>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">{children}</div>
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
