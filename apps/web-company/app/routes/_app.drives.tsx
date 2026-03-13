import { useEffect, useMemo, useState } from 'react';
import { useFetcher, useLoaderData } from '@remix-run/react';
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
    Briefcase,
    Calendar,
    CheckCircle2,
    ExternalLink,
    FileText,
    IndianRupee,
    Layers3,
    MapPin,
    Plus,
    Search,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Modal, Textarea } from '@careernest/ui';
import { formatDate } from '@careernest/ui';
import { api } from '@careernest/lib';
import {
    loadCompanyDrives,
    loadDriveApplicationSummaries,
    requireCompanyContext,
} from '~/utils/company.server';
import {
    formatJobLevelLabel,
    formatJobTypeLabel,
    formatSalaryDisplay,
    getDaysUntil,
} from '~/utils/company.shared';

export const meta: MetaFunction = () => [{ title: 'Drives - Company Portal - CareerNest' }];

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EE', 'ME', 'CE', 'Civil', 'BBA', 'MBA', 'MCA'] as const;

type ActionData = { success?: boolean; error?: string };

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user, company } = await requireCompanyContext(request);
    const drives = await loadCompanyDrives(token, user, company);
    const summaries = await loadDriveApplicationSummaries(token, drives);

    const enrichedDrives = drives.map((drive) => ({
        ...drive,
        summary: summaries[drive.id] || {
            total: 0,
            applied: 0,
            underReview: 0,
            shortlisted: 0,
            interviewScheduled: 0,
            selected: 0,
            rejected: 0,
        },
    }));

    return json({ company, drives: enrichedDrives });
}

export async function action({ request }: ActionFunctionArgs) {
    const { token } = await requireCompanyContext(request);
    const form = await request.formData();
    const deadlineInput = String(form.get('deadline') || '');
    const parsedDeadline = deadlineInput ? new Date(deadlineInput) : null;

    if (!parsedDeadline || Number.isNaN(parsedDeadline.getTime())) {
        return json<ActionData>({ error: 'Please provide a valid application deadline.' }, { status: 400 });
    }

    try {
        const payload = {
            title: String(form.get('title') || ''),
            status: 'active' as const,
            jobLevel: String(form.get('jobLevel') || ''),
            jobType: String(form.get('jobType') || ''),
            experience: String(form.get('experience') || ''),
            ctcPeriod: String(form.get('ctcPeriod') || ''),
            location: String(form.get('location') || ''),
            vacancies: Number(form.get('vacancies') || 0),
            description: String(form.get('description') || ''),
            salary: Number(form.get('salary') || 0),
            deadline: parsedDeadline.toISOString(),
            department: form.getAll('department').map((value) => String(value)),
            studyingYear: String(form.get('studyingYear') || ''),
            externalLink: String(form.get('externalLink') || '') || undefined,
            CGPA: Number(form.get('CGPA') || 0),
            Backlogs: Number(form.get('Backlogs') || 0),
        };

        await api.drives.create(token, payload);
        return json<ActionData>({ success: true });
    } catch (error: unknown) {
        const err = error as { message?: string };
        return json<ActionData>({ error: err.message || 'Failed to create drive.' }, { status: 400 });
    }
}

export default function CompanyDrives() {
    const { company, drives } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<ActionData>();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (fetcher.data?.success) {
            setShowModal(false);
        }
    }, [fetcher.data]);

    const filteredDrives = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return drives.filter((drive) => {
            const matchesSearch = !query || [
                drive.title,
                drive.location,
                drive.jobType,
                drive.jobLevel,
                ...drive.department,
            ].some((value) => value.toLowerCase().includes(query));
            const matchesStatus = !statusFilter || drive.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [drives, searchQuery, statusFilter]);

    const stats = {
        totalDrives: drives.length,
        activeDrives: drives.filter((drive) => drive.status === 'active' && getDaysUntil(drive.deadline) >= 0).length,
        applications: drives.reduce((sum, drive) => sum + drive.summary.total, 0),
        selected: drives.reduce((sum, drive) => sum + drive.summary.selected, 0),
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-600">{company.name}</p>
                    <h1 className="text-2xl font-bold text-surface-900">Hiring Drives</h1>
                    <p className="mt-1 text-surface-500">Create and monitor drive pipelines for your campus hiring plan.</p>
                </div>
                <Button onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Create Drive
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-50 p-2 text-blue-600"><Briefcase size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{stats.totalDrives}</p>
                            <p className="text-xs text-surface-500">Total Drives</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><Layers3 size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{stats.activeDrives}</p>
                            <p className="text-xs text-surface-500">Active Pipelines</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-primary-50 p-2 text-primary-600"><FileText size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{stats.applications}</p>
                            <p className="text-xs text-surface-500">Applications</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-amber-50 p-2 text-amber-600"><CheckCircle2 size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{stats.selected}</p>
                            <p className="text-xs text-surface-500">Selections</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="!p-4">
                <div className="flex flex-col gap-3 lg:flex-row">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search by role, location, department or type..."
                            className="w-full rounded-xl border border-surface-200 bg-surface-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="form-input w-full lg:w-44"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>
            </Card>

            {filteredDrives.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {filteredDrives.map((drive) => {
                        const daysLeft = getDaysUntil(drive.deadline);
                        return (
                            <Card key={drive.id} hover className="!p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-lg font-semibold text-surface-900">{drive.title}</h2>
                                            <Badge variant={drive.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-600'}>
                                                {drive.status}
                                            </Badge>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-surface-500">
                                            <span className="flex items-center gap-1"><IndianRupee size={13} /> {formatSalaryDisplay(drive.salary, drive.ctcPeriod)}</span>
                                            {drive.location && <span className="flex items-center gap-1"><MapPin size={13} /> {drive.location}</span>}
                                            {drive.deadline && <span className="flex items-center gap-1"><Calendar size={13} /> {formatDate(drive.deadline)}</span>}
                                        </div>
                                    </div>
                                    <Badge variant="bg-primary-50 text-primary-700">{formatJobTypeLabel(drive.jobType)}</Badge>
                                </div>

                                <p className="mt-4 text-sm text-surface-600">
                                    {drive.description || 'No description added yet.'}
                                </p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Badge variant="bg-surface-100 text-surface-700">{formatJobLevelLabel(drive.jobLevel)}</Badge>
                                    {drive.department.map((department) => (
                                        <Badge key={department} variant="bg-indigo-50 text-indigo-700">{department}</Badge>
                                    ))}
                                    {drive.studyingYear && <Badge variant="bg-amber-50 text-amber-700">{drive.studyingYear} year</Badge>}
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                                    <div className="rounded-xl bg-surface-50 p-3">
                                        <p className="text-xs uppercase tracking-wide text-surface-400">Applicants</p>
                                        <p className="mt-1 text-xl font-semibold text-surface-900">{drive.summary.total}</p>
                                    </div>
                                    <div className="rounded-xl bg-surface-50 p-3">
                                        <p className="text-xs uppercase tracking-wide text-surface-400">Reviewing</p>
                                        <p className="mt-1 text-xl font-semibold text-surface-900">{drive.summary.underReview}</p>
                                    </div>
                                    <div className="rounded-xl bg-surface-50 p-3">
                                        <p className="text-xs uppercase tracking-wide text-surface-400">Shortlisted</p>
                                        <p className="mt-1 text-xl font-semibold text-primary-600">{drive.summary.shortlisted + drive.summary.interviewScheduled}</p>
                                    </div>
                                    <div className="rounded-xl bg-surface-50 p-3">
                                        <p className="text-xs uppercase tracking-wide text-surface-400">Selected</p>
                                        <p className="mt-1 text-xl font-semibold text-emerald-600">{drive.summary.selected}</p>
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-col gap-3 border-t border-surface-100 pt-4 md:flex-row md:items-center md:justify-between">
                                    <div className="flex flex-wrap gap-3 text-sm text-surface-500">
                                        <span>{drive.vacancies} vacancies</span>
                                        <span>CGPA {drive.CGPA}+</span>
                                        <span>Backlogs up to {drive.Backlogs}</span>
                                        {daysLeft >= 0 && <span>{daysLeft === 0 ? 'Closes today' : `${daysLeft} days left`}</span>}
                                    </div>
                                    {drive.externalLink ? (
                                        <a
                                            href={drive.externalLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                                        >
                                            View external listing <ExternalLink size={14} />
                                        </a>
                                    ) : null}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card>
                    <EmptyState
                        icon={<Briefcase size={28} />}
                        title="No drives match these filters"
                        description={searchQuery || statusFilter ? 'Adjust your filters to see more drives.' : 'Create your first drive to start collecting applications.'}
                        action={!searchQuery && !statusFilter ? <Button onClick={() => setShowModal(true)}>Create Drive</Button> : undefined}
                    />
                </Card>
            )}

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Drive" size="lg">
                <fetcher.Form method="post" className="space-y-5">
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                        This drive will automatically be linked to <span className="font-semibold">{company.name}</span>.
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input name="title" label="Role Title" placeholder="e.g. Software Engineer" required />
                        <div>
                            <label className="form-label">Job Level</label>
                            <select name="jobLevel" className="form-input" required>
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
                            <select name="jobType" className="form-input" required>
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
                            <select name="experience" className="form-input" required>
                                <option value="fresher">Fresher</option>
                                <option value="0-1">0-1 years</option>
                                <option value="1-2">1-2 years</option>
                                <option value="2-3">2-3 years</option>
                                <option value="3-5">3-5 years</option>
                                <option value="5+">5+ years</option>
                            </select>
                        </div>
                        <Input name="salary" label="CTC / Salary" type="number" min="0" placeholder="600000" required />
                        <div>
                            <label className="form-label">Salary Period</label>
                            <select name="ctcPeriod" className="form-input" required>
                                <option value="annual">Annual</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                        <Input name="location" label="Location" placeholder="Bengaluru / Remote" required />
                        <Input name="vacancies" label="Vacancies" type="number" min="1" placeholder="10" required />
                        <Input name="deadline" label="Application Deadline" type="date" required />
                        <div>
                            <label className="form-label">Studying Year</label>
                            <select name="studyingYear" className="form-input" required>
                                <option value="">Select year</option>
                                <option value="1st">1st</option>
                                <option value="2nd">2nd</option>
                                <option value="3rd">3rd</option>
                                <option value="4th">4th</option>
                                <option value="5th">5th</option>
                                <option value="graduate">Graduate</option>
                            </select>
                        </div>
                        <Input name="CGPA" label="Minimum CGPA" type="number" min="0" max="10" step="0.1" placeholder="7.0" required />
                        <Input name="Backlogs" label="Maximum Backlogs" type="number" min="0" placeholder="0" required />
                    </div>

                    <div>
                        <label className="form-label">Eligible Departments</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {DEPARTMENTS.map((department) => (
                                <label key={department} className="flex items-center gap-2 rounded-lg border border-surface-200 px-3 py-2 text-sm transition-colors hover:bg-surface-50">
                                    <input type="checkbox" name="department" value={department} className="rounded border-surface-300 text-primary-600" />
                                    {department}
                                </label>
                            ))}
                        </div>
                    </div>

                    <Textarea
                        name="description"
                        label="Drive Description"
                        placeholder="Summarize responsibilities, must-have skills, and how candidates will be evaluated."
                        rows={4}
                        required
                    />
                    <Input name="externalLink" label="External Application Link" type="url" placeholder="https://careers.example.com/apply" />

                    {fetcher.data?.error ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {fetcher.data.error}
                        </div>
                    ) : null}

                    <div className="flex justify-end gap-3 border-t border-surface-100 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button type="submit" disabled={fetcher.state !== 'idle'}>
                            {fetcher.state !== 'idle' ? 'Creating...' : 'Create Drive'}
                        </Button>
                    </div>
                </fetcher.Form>
            </Modal>
        </div>
    );
}
