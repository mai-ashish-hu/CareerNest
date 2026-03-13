import { useState, useEffect } from 'react';
import { Plus, Search, Briefcase, Calendar, IndianRupee, MapPin, Eye, Pencil, Trash2, Building2, UserCheck, GraduationCap, ExternalLink, Link } from 'lucide-react';
import { Button, Card, Badge, Modal, Input, Textarea, EmptyState, Avatar } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, useFetcher, Link as RemixLink } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Drives – College – CareerNest' }];

interface Drive {
    id: string;
    company: string;
    companyId: string;
    title: string;
    jobLevel: string;
    jobType: string;
    experience: string;
    salary: number;
    ctcPeriod: string;
    location: string;
    vacancies: number;
    department: string[];
    studyingYear: string;
    externalLink: string;
    CGPA: number;
    Backlogs: number;
    deadline: string;
    description: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) throw redirect('/login');
    const tenantId = user.tenantId;

    const [drivesRes, companiesRes] = await Promise.all([
        api.drives.list(token, `tenantId=${tenantId}&limit=500`).catch(() => ({ data: [], total: 0 })) as Promise<{ data: any[]; total: number }>,
        api.companies.list(token, `tenantId=${tenantId}&limit=500`).catch(() => ({ data: [], total: 0 })) as Promise<{ data: any[]; total: number }>,
    ]);

    const companyMap = new Map<string, string>();
    for (const c of (companiesRes.data || [])) {
        companyMap.set(c.$id || c.id, c.name || c.companyName || '');
    }

    const drives: Drive[] = (drivesRes.data || []).map((d: any) => {
        const companyRef = d.companies;
        const companyId = Array.isArray(companyRef)
            ? (companyRef[0]?.$id || companyRef[0] || '')
            : (companyRef?.$id || companyRef || '');
        const companyName = Array.isArray(companyRef)
            ? (companyRef[0]?.name || companyMap.get(companyId) || '')
            : (companyRef?.name || companyMap.get(companyId) || '');
        return {
            id: d.$id || d.id || '',
            company: companyName,
            companyId,
            title: d.title || '',
            jobLevel: d.jobLevel || '',
            jobType: d.jobType || '',
            experience: d.experience || 'fresher',
            salary: d.salary ?? 0,
            ctcPeriod: d.ctcPeriod || 'annual',
            location: d.location || '',
            vacancies: d.vacancies ?? 0,
            department: Array.isArray(d.department) ? d.department : (d.department ? [d.department] : []),
            studyingYear: d.studyingYear || '',
            externalLink: d.externalLink || '',
            CGPA: d.CGPA ?? 0,
            Backlogs: d.Backlogs ?? 0,
            deadline: d.deadline || '',
            description: d.description || '',
        };
    });

    return json({ drives, companies: companiesRes.data || [] });
}

export async function action({ request }: ActionFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) return json({ error: 'Unauthorized' }, { status: 403 });

    const form = await request.formData();
    const intent = form.get('_action') as string;

    if (intent === 'delete') {
        const driveId = form.get('driveId') as string;
        if (!driveId) return json({ error: 'Drive ID required' }, { status: 400 });
        try {
            await api.drives.delete(token, driveId);
            return json({ success: true, deleted: driveId });
        } catch (err: any) {
            return json({ error: err?.message || 'Failed to delete drive' }, { status: 500 });
        }
    }

    const payload = {
        companies: form.get('companies') as string,
        title: form.get('title') as string,
        jobLevel: form.get('jobLevel') as string,
        jobType: form.get('jobType') as string,
        experience: form.get('experience') as string,
        salary: Number(form.get('salary')),
        ctcPeriod: form.get('ctcPeriod') as string,
        location: form.get('location') as string,
        vacancies: Number(form.get('vacancies')),
        deadline: new Date(form.get('deadline') as string).toISOString(),
        department: form.getAll('department') as string[],
        studyingYear: form.get('studyingYear') as string,
        externalLink: (form.get('externalLink') as string) || undefined,
        CGPA: Number(form.get('CGPA')),
        Backlogs: Number(form.get('Backlogs')),
        description: form.get('description') as string,
    };

    if (intent === 'update') {
        const driveId = form.get('driveId') as string;
        if (!driveId) return json({ error: 'Drive ID required' }, { status: 400 });
        try {
            const { companies: _c, ...updatePayload } = payload;
            await api.drives.update(token, driveId, updatePayload);
            return json({ success: true });
        } catch (err: any) {
            return json({ error: err?.message || 'Failed to update drive' }, { status: 500 });
        }
    }

    try {
        await api.drives.create(token, payload);
        return json({ success: true });
    } catch (err: any) {
        return json({ error: err?.message || 'Failed to create drive' }, { status: 500 });
    }
}

function formatCTC(salary: number, period: string): string {
    if (period === 'monthly') return `₹${salary.toLocaleString('en-IN')}/mo`;
    if (salary >= 100000) return `₹${(salary / 100000).toFixed(1)} LPA`;
    return `₹${salary.toLocaleString('en-IN')}`;
}

function formatJobLevel(level: string): string {
    const map: Record<string, string> = { internship: 'Internship', entry: 'Entry Level', junior: 'Junior', mid: 'Mid Level', senior: 'Senior' };
    return map[level] || level;
}

function formatJobType(type: string): string {
    const map: Record<string, string> = { 'full-time': 'Full Time', 'part-time': 'Part Time', internship: 'Internship', contract: 'Contract', freelance: 'Freelance' };
    return map[type] || type;
}

export default function Drives() {
    const { drives, companies } = useLoaderData<typeof loader>() as { drives: Drive[]; companies: any[] };
    const fetcher = useFetcher<{ success?: boolean; error?: string; deleted?: string }>();
    const deleteFetcher = useFetcher<{ success?: boolean; error?: string }>();
    const [showModal, setShowModal] = useState(false);
    const [editDrive, setEditDrive] = useState<Drive | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (fetcher.data?.success) {
            setShowModal(false);
            setEditDrive(null);
        }
    }, [fetcher.data]);

    const filtered = drives.filter((d) => {
        const q = searchQuery.toLowerCase();
        return d.company.toLowerCase().includes(q) ||
            d.title.toLowerCase().includes(q) ||
            d.department.some(dept => dept.toLowerCase().includes(q));
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900">Placement Drives</h1>
                    <p className="text-surface-500 mt-1">Manage campus placement drives</p>
                </div>
                <Button onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Create Drive
                </Button>
            </div>

            {/* Stats & Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Briefcase size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{drives.length}</p>
                            <p className="text-xs text-surface-500">Total Drives</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><UserCheck size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{drives.reduce((a, d) => a + d.vacancies, 0)}</p>
                            <p className="text-xs text-surface-500">Total Vacancies</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-50 text-purple-600"><Building2 size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{new Set(drives.map(d => d.companyId)).size}</p>
                            <p className="text-xs text-surface-500">Companies Hiring</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Search */}
            <Card className="!p-4">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    <input
                        type="text"
                        placeholder="Search by company, role, or department..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                </div>
            </Card>

            {/* Drive Cards */}
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filtered.map((drive) => (
                        <Card key={drive.id} hover className="!p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <Avatar name={drive.company} size="md" />
                                    <div>
                                        <h3 className="font-semibold text-surface-900">{drive.title}</h3>
                                        <p className="text-sm text-surface-500">{drive.company}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant="bg-primary-50 text-primary-700">{formatJobType(drive.jobType)}</Badge>
                                    <Badge variant="bg-surface-100 text-surface-600">{formatJobLevel(drive.jobLevel)}</Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="flex items-center gap-2 text-sm text-surface-600">
                                    <IndianRupee size={14} className="text-surface-400" />
                                    <span className="font-medium">{formatCTC(drive.salary, drive.ctcPeriod)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-surface-600">
                                    <MapPin size={14} className="text-surface-400" />
                                    <span className="truncate">{drive.location || '—'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-surface-600">
                                    <Calendar size={14} className="text-surface-400" />
                                    <span>{drive.deadline ? new Date(drive.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-surface-600">
                                    <UserCheck size={14} className="text-surface-400" />
                                    <span>{drive.vacancies} {drive.vacancies === 1 ? 'vacancy' : 'vacancies'}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-4 text-xs flex-wrap">
                                {drive.department.map(dept => (
                                    <span key={dept} className="px-2 py-1 bg-primary-50 rounded-md text-primary-700 font-medium">{dept}</span>
                                ))}
                                {drive.studyingYear && <span className="px-2 py-1 bg-indigo-50 rounded-md text-indigo-600"><GraduationCap size={12} className="inline mr-1" />{drive.studyingYear} Year</span>}
                                <span className="px-2 py-1 bg-surface-50 rounded-md text-surface-500">Exp: {drive.experience}</span>
                                <span className="px-2 py-1 bg-surface-50 rounded-md text-surface-500">CGPA ≥ {drive.CGPA}</span>
                                <span className="px-2 py-1 bg-surface-50 rounded-md text-surface-500">Backlogs ≤ {drive.Backlogs}</span>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-surface-100">
                                {drive.externalLink ? (
                                    <a href={drive.externalLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 hover:underline">
                                        <ExternalLink size={13} /> Apply Link
                                    </a>
                                ) : <span />}
                                <div className="flex items-center gap-1">
                                    <RemixLink
                                        to={`/drives/${drive.id}`}
                                        className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                        title="Manage Applications"
                                    >
                                        <Eye size={15} />
                                    </RemixLink>
                                    <button
                                        className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                        title="Edit"
                                        onClick={() => { setEditDrive(drive); setShowModal(true); }}
                                    >
                                        <Pencil size={15} />
                                    </button>
                                    <button
                                        className="p-1.5 rounded-lg text-surface-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                        title="Delete"
                                        onClick={() => {
                                            if (confirm(`Delete drive "${drive.title}"? This cannot be undone.`)) {
                                                deleteFetcher.submit(
                                                    { _action: 'delete', driveId: drive.id },
                                                    { method: 'post' }
                                                );
                                            }
                                        }}
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <EmptyState
                        icon={<Briefcase size={28} />}
                        title="No drives found"
                        description={searchQuery ? 'Try adjusting your search or filter.' : 'Create your first placement drive to get started.'}
                        action={!searchQuery ? <Button onClick={() => setShowModal(true)}><Plus size={16} /> Create Drive</Button> : undefined}
                    />
                </Card>
            )}

            {/* Create / Edit Drive Modal */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditDrive(null); }} title={editDrive ? 'Edit Drive' : 'Create New Drive'} size="lg">
                <fetcher.Form method="post" className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
                    <input type="hidden" name="_action" value={editDrive ? 'update' : 'create'} />
                    {editDrive && <input type="hidden" name="driveId" value={editDrive.id} />}
                    {/* Section 1: Company & Role */}
                    <div>
                        <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Company & Role</h4>
                        <div className="grid grid-cols-2 gap-4">
                            {!editDrive && (
                            <div className="col-span-2">
                                <label className="form-label">Company</label>
                                <select name="companies" className="form-input" required>
                                    <option value="">Select a company</option>
                                    {companies.map((c: any) => (
                                        <option key={c.$id || c.id} value={c.$id || c.id}>{c.name || c.companyName}</option>
                                    ))}
                                </select>
                            </div>
                            )}
                            <Input key={`title-${editDrive?.id}`} name="title" label="Job Role / Title" placeholder="e.g., SDE-1, Data Analyst" defaultValue={editDrive?.title} required />
                            <div>
                                <label className="form-label">Job Level</label>
                                <select name="jobLevel" className="form-input" defaultValue={editDrive?.jobLevel || ''} required>
                                    <option value="">Select level</option>
                                    <option value="internship">Internship</option>
                                    <option value="entry">Entry Level</option>
                                    <option value="junior">Junior</option>
                                    <option value="mid">Mid Level</option>
                                    <option value="senior">Senior</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Job Type</label>
                                <select name="jobType" className="form-input" defaultValue={editDrive?.jobType || ''} required>
                                    <option value="">Select type</option>
                                    <option value="full-time">Full Time</option>
                                    <option value="part-time">Part Time</option>
                                    <option value="internship">Internship</option>
                                    <option value="contract">Contract</option>
                                    <option value="freelance">Freelance</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Experience Required</label>
                                <select name="experience" className="form-input" defaultValue={editDrive?.experience || 'fresher'} required>
                                    <option value="fresher">Fresher (0 years)</option>
                                    <option value="0-1">0 – 1 year</option>
                                    <option value="1-2">1 – 2 years</option>
                                    <option value="2-3">2 – 3 years</option>
                                    <option value="3-5">3 – 5 years</option>
                                    <option value="5+">5+ years</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Compensation & Details */}
                    <div className="border-t border-surface-100 pt-4">
                        <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Compensation & Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input key={`salary-${editDrive?.id}`} name="salary" label="CTC / Salary" placeholder="e.g., 600000" type="number" icon={<IndianRupee size={16} />} defaultValue={editDrive?.salary?.toString()} required />
                            <div>
                                <label className="form-label">Salary Period</label>
                                <select name="ctcPeriod" className="form-input" defaultValue={editDrive?.ctcPeriod || 'annual'} required>
                                    <option value="annual">Per Annum (Yearly)</option>
                                    <option value="monthly">Per Month</option>
                                </select>
                            </div>
                            <Input key={`location-${editDrive?.id}`} name="location" label="Location" placeholder="e.g., Bengaluru, Remote" icon={<MapPin size={16} />} defaultValue={editDrive?.location} required />
                            <Input key={`vacancies-${editDrive?.id}`} name="vacancies" label="No. of Vacancies" placeholder="e.g., 10" type="number" min="1" icon={<UserCheck size={16} />} defaultValue={editDrive?.vacancies?.toString()} required />
                            <Input key={`deadline-${editDrive?.id}`} name="deadline" label="Application Deadline" type="date" icon={<Calendar size={16} />} defaultValue={editDrive?.deadline ? editDrive.deadline.substring(0, 10) : undefined} required />
                        </div>
                    </div>

                    {/* Section 3: Eligibility */}
                    <div className="border-t border-surface-100 pt-4">
                        <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Eligibility Criteria</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input key={`cgpa-${editDrive?.id}`} name="CGPA" label="Minimum CGPA" placeholder="e.g., 7.0" type="number" step="0.1" defaultValue={editDrive?.CGPA?.toString()} required />
                            <Input key={`backlogs-${editDrive?.id}`} name="Backlogs" label="Maximum Backlogs" placeholder="e.g., 0" type="number" defaultValue={editDrive?.Backlogs?.toString()} required />
                        </div>
                        <div className="mt-3">
                            <label className="form-label">Studying Year</label>
                            <select name="studyingYear" className="form-input" defaultValue={editDrive?.studyingYear || ''} required>
                                <option value="">Select year</option>
                                <option value="1st">1st Year</option>
                                <option value="2nd">2nd Year</option>
                                <option value="3rd">3rd Year</option>
                                <option value="4th">4th Year</option>
                                <option value="5th">5th Year</option>
                                <option value="graduate">Graduate</option>
                            </select>
                        </div>
                        <div className="mt-3">
                            <label className="form-label">Eligible Departments</label>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {['CSE', 'IT', 'ECE', 'EE', 'ME', 'CE', 'Civil', 'BBA', 'MBA', 'MCA'].map((dept) => (
                                    <label key={dept} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-200 hover:bg-surface-50 cursor-pointer text-sm transition-colors">
                                        <input type="checkbox" name="department" value={dept} className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                                            defaultChecked={editDrive?.department?.includes(dept)} />
                                        {dept}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Description & Link */}
                    <div className="border-t border-surface-100 pt-4">
                        <Textarea key={`desc-${editDrive?.id}`} name="description" label="Job Description" placeholder="Brief description of the role, responsibilities, perks, work culture..." rows={3} defaultValue={editDrive?.description} required />
                        <div className="mt-3">
                            <Input key={`extlink-${editDrive?.id}`} name="externalLink" label="External Application Link" placeholder="https://careers.company.com/apply" type="url" icon={<Link size={16} />} defaultValue={editDrive?.externalLink} />
                        </div>
                    </div>

                    {fetcher.data?.error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{fetcher.data.error}</div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                        <Button variant="ghost" type="button" onClick={() => { setShowModal(false); setEditDrive(null); }}>Cancel</Button>
                        <Button type="submit" disabled={fetcher.state !== 'idle'}>
                            {fetcher.state !== 'idle' ? (editDrive ? 'Saving…' : 'Creating…') : (editDrive ? 'Save Changes' : 'Create Drive')}
                        </Button>
                    </div>
                </fetcher.Form>
            </Modal>
        </div>
    );
}
