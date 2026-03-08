import { useState, useEffect } from 'react';
import { Search, Briefcase, Calendar, MapPin, IndianRupee, Users, Clock, Building2, GraduationCap, ExternalLink, CheckCircle2, Send, AlertCircle } from 'lucide-react';
import { Card, Badge, Button, EmptyState, Avatar, Modal } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Drives – Student – CareerNest' }];

interface Drive {
    id: string;
    title: string;
    company: string;
    salary: number;
    location: string;
    department: string[];
    CGPA: number;
    Backlogs: number;
    deadline: string;
    vacancies: number;
    jobType: string;
    jobLevel: string;
    experience: string;
    ctcPeriod: string;
    studyingYear: string;
    description: string;
    externalLink: string;
}

interface StudentProfile {
    department?: string;
    phoneNumber?: string | number;
    CGPA?: number;
    backlogs?: number;
}

const DEGREE_OPTIONS = ['B.Tech', 'M.Tech', 'BCA', 'MCA', 'BSc', 'MSc', 'MBA', 'PhD', 'Diploma', 'Other'] as const;
const ACADEMIC_YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate'] as const;

export async function action({ request }: ActionFunctionArgs) {
    const { token } = await requireUserSession(request);
    const formData = await request.formData();

    const driveId = formData.get('driveId') as string;
    if (!driveId) return json({ error: 'Drive ID is required', driveId: '' }, { status: 400 });

    const agreedToTerms = formData.get('agreedToTerms') === 'on';
    if (!agreedToTerms) return json({ error: 'You must agree to the terms and conditions to apply.', driveId }, { status: 400 });

    const payload = {
        driveId,
        phoneNumber: (formData.get('phoneNumber') as string || '').trim(),
        currentCity: (formData.get('currentCity') as string || '').trim(),
        degree: formData.get('degree') as string,
        branch: (formData.get('branch') as string || '').trim(),
        academicYear: formData.get('academicYear') as string,
        graduationYear: parseInt(formData.get('graduationYear') as string, 10),
        cgpa: parseFloat(formData.get('cgpa') as string),
        hasBacklogs: formData.get('hasBacklogs') === 'true',
        backlogCount: parseInt(formData.get('backlogCount') as string || '0', 10),
        skills: (formData.get('skills') as string || '').trim() || undefined,
        coverLetter: (formData.get('coverLetter') as string || '').trim() || undefined,
        resumeFileId: (formData.get('resumeFileId') as string || '').trim() || undefined,
        agreedToTerms: true as const,
    };

    try {
        await api.applications.create(token, payload);
        return json({ success: true, driveId });
    } catch (err: any) {
        return json({ error: err?.message || 'Failed to submit application. Please try again.', driveId }, { status: 400 });
    }
}

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    const tenantId = user.tenantId;

    const [drivesRes, applicationsRes, profileRes] = await Promise.all([
        api.drives.list(token, `${tenantId ? `tenantId=${tenantId}&` : ''}limit=500`).catch(() => ({ data: [], total: 0 })),
        api.applications.list(token, 'limit=500').catch(() => ({ data: [], total: 0 })),
        api.students.getMyProfile(token).catch(() => null),
    ]) as [any, any, any];

    const drives: Drive[] = (drivesRes.data || []).map((d: any) => {
        const companyRef = d.companies;
        const companyName = Array.isArray(companyRef)
            ? (companyRef[0]?.name || 'Unknown Company')
            : (companyRef?.name || 'Unknown Company');
        return {
            id: d.$id || d.id || '',
            title: d.title || '',
            company: companyName,
            salary: d.salary ?? 0,
            location: d.location || '',
            department: Array.isArray(d.department) ? d.department : (d.department ? [d.department] : []),
            CGPA: d.CGPA ?? 0,
            Backlogs: d.Backlogs ?? 0,
            deadline: d.deadline || '',
            vacancies: d.vacancies ?? 0,
            jobType: d.jobType || '',
            jobLevel: d.jobLevel || '',
            experience: d.experience || 'fresher',
            ctcPeriod: d.ctcPeriod || 'annual',
            studyingYear: d.studyingYear || '',
            description: d.description || '',
            externalLink: d.externalLink || '',
        };
    });

    const appliedDriveIds: string[] = (applicationsRes.data || []).map((a: any) => a.driveId as string);
    const profile: StudentProfile | null = (profileRes as any)?.data || null;

    return json({ drives, appliedDriveIds, profile });
}

function formatSalary(salary: number): string {
    if (salary >= 100000) return `₹${(salary / 100000).toFixed(1)} LPA`;
    if (salary > 0) return `₹${salary.toLocaleString('en-IN')}`;
    return 'Not disclosed';
}

function getDaysLeft(deadline: string): number {
    if (!deadline) return -1;
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Apply Form (rendered inside Modal) ─────────────────────────────────────
function ApplyModal({
    drive,
    profile,
    fetcher,
    onClose,
}: {
    drive: Drive;
    profile: StudentProfile | null;
    fetcher: ReturnType<typeof useFetcher<typeof action>>;
    onClose: () => void;
}) {
    const [hasBacklogs, setHasBacklogs] = useState(false);
    const isSubmitting = fetcher.state !== 'idle';
    const data = fetcher.data as any;
    const error = data?.error && data?.driveId === drive.id ? data.error : null;

    useEffect(() => {
        if (data?.success && data?.driveId === drive.id) onClose();
    }, [data]);

    return (
        <fetcher.Form method="post">
            <input type="hidden" name="driveId" value={drive.id} />

            {/* Drive summary */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-100 mb-6">
                <Avatar name={drive.company || drive.title} size="md" />
                <div>
                    <p className="font-semibold text-surface-900">{drive.title}</p>
                    <p className="text-sm text-surface-500">{drive.company} · {formatSalary(drive.salary)}</p>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm mb-5">
                    <AlertCircle size={15} className="flex-shrink-0" />{error}
                </div>
            )}

            {/* Section 1 – Contact */}
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-widest mb-3">1 · Contact Details</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Phone Number <span className="text-rose-500">*</span></label>
                    <input name="phoneNumber" type="tel" required defaultValue={String(profile?.phoneNumber ?? '')} placeholder="9876543210" className="form-input w-full" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Current City <span className="text-rose-500">*</span></label>
                    <input name="currentCity" type="text" required placeholder="e.g. Pune" className="form-input w-full" />
                </div>
            </div>

            <hr className="border-surface-100 mb-6" />

            {/* Section 2 – Academic */}
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-widest mb-3">2 · Academic Details</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Degree <span className="text-rose-500">*</span></label>
                    <select name="degree" required className="form-input w-full">
                        <option value="">Select degree</option>
                        {DEGREE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Branch / Department <span className="text-rose-500">*</span></label>
                    <input name="branch" type="text" required defaultValue={profile?.department ?? ''} placeholder="e.g. Computer Science" className="form-input w-full" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Current Year <span className="text-rose-500">*</span></label>
                    <select name="academicYear" required className="form-input w-full">
                        <option value="">Select year</option>
                        {ACADEMIC_YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Graduation Year <span className="text-rose-500">*</span></label>
                    <input name="graduationYear" type="number" required min={2024} max={2035} placeholder="2026" className="form-input w-full" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">CGPA <span className="text-rose-500">*</span></label>
                    <input name="cgpa" type="number" step="0.01" required min={0} max={10} defaultValue={profile?.CGPA ?? ''} placeholder="e.g. 7.50" className="form-input w-full" />
                </div>
                <div className="flex flex-col justify-center gap-3">
                    <input type="hidden" name="hasBacklogs" value={hasBacklogs ? 'true' : 'false'} />
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <button
                            type="button"
                            onClick={() => setHasBacklogs(v => !v)}
                            className={`relative w-10 h-5 rounded-full flex-shrink-0 transition-colors ${hasBacklogs ? 'bg-rose-500' : 'bg-surface-200'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${hasBacklogs ? 'translate-x-5' : ''}`} />
                        </button>
                        <span className="text-sm font-medium text-surface-700">Has Active Backlogs</span>
                    </label>
                    {hasBacklogs ? (
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Backlog Count <span className="text-rose-500">*</span></label>
                            <input name="backlogCount" type="number" required min={1} max={50} placeholder="e.g. 2" className="form-input w-full" />
                        </div>
                    ) : (
                        <input type="hidden" name="backlogCount" value="0" />
                    )}
                </div>
            </div>

            <hr className="border-surface-100 mb-6" />

            {/* Section 3 – Materials */}
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-widest mb-3">3 · Application Materials</p>
            <div className="space-y-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Key Skills <span className="text-xs text-surface-400 font-normal">(optional)</span></label>
                    <textarea name="skills" rows={2} placeholder="e.g. Python, React, SQL, Problem Solving..." className="form-input w-full resize-none" maxLength={2000} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Cover Letter <span className="text-xs text-surface-400 font-normal">(optional)</span></label>
                    <textarea name="coverLetter" rows={4} placeholder="Tell the company why you're a great fit for this role..." className="form-input w-full resize-none" maxLength={5000} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Resume URL <span className="text-xs text-surface-400 font-normal">(optional — paste a link to your resume)</span></label>
                    <input name="resumeFileId" type="url" placeholder="https://drive.google.com/your-resume" className="form-input w-full" />
                </div>
            </div>

            <hr className="border-surface-100 mb-5" />

            {/* Section 4 – Terms */}
            <label className="flex items-start gap-3 cursor-pointer mb-6">
                <input type="checkbox" name="agreedToTerms" required className="mt-0.5 accent-primary-600" />
                <span className="text-sm text-surface-600">
                    I confirm all information is accurate and consent to sharing my details with the recruiting company per CareerNest's <span className="text-primary-600 font-medium">Terms &amp; Conditions</span>.
                </span>
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-100">
                <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" isLoading={isSubmitting}>
                    <Send size={15} /> Submit Application
                </Button>
            </div>
        </fetcher.Form>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Drives() {
    const { drives, appliedDriveIds, profile } = useLoaderData<typeof loader>() as {
        drives: Drive[];
        appliedDriveIds: string[];
        profile: StudentProfile | null;
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [applyingTo, setApplyingTo] = useState<Drive | null>(null);

    const fetcher = useFetcher<typeof action>();

    // Build set of applied driveIds — optimistically include any just-submitted
    const appliedSet = new Set(appliedDriveIds);
    const latestData = fetcher.data as any;
    if (latestData?.success) appliedSet.add(latestData.driveId);

    const departments = [...new Set(drives.flatMap(d => d.department))].sort();

    const filtered = drives.filter((d) => {
        const q = searchQuery.toLowerCase();
        const matchSearch = d.title.toLowerCase().includes(q) ||
            d.company.toLowerCase().includes(q) ||
            d.location.toLowerCase().includes(q);
        const matchDept = !deptFilter || d.department.includes(deptFilter);
        return matchSearch && matchDept;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-surface-900">Placement Drives</h1>
                <p className="text-surface-500 mt-1">Browse campus placement opportunities</p>
            </div>

            {/* Search & Filters */}
            <Card className="!p-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                        <input
                            type="text"
                            placeholder="Search by title, company or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <select
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                        className="form-input w-44 !py-2.5"
                    >
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </Card>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-surface-500">
                <span className="font-medium text-surface-700">{filtered.length}</span> drive{filtered.length !== 1 ? 's' : ''} found
            </div>

            {/* Drive Cards */}
            {filtered.length > 0 ? (
                <div className="space-y-4">
                    {filtered.map((drive) => {
                        const daysLeft = getDaysLeft(drive.deadline);
                        const isExpired = daysLeft < 0;
                        const isApplied = appliedSet.has(drive.id);
                        return (
                            <Card key={drive.id} hover className="!p-0 overflow-hidden">
                                <div className="p-5">
                                    <div className="flex items-start gap-4">
                                        <Avatar name={drive.company || drive.title} size="lg" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-surface-900">{drive.title}</h3>
                                                    {drive.company && <p className="text-surface-500 flex items-center gap-1"><Building2 size={14} /> {drive.company}</p>}
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {isApplied && (
                                                        <Badge variant="bg-emerald-100 text-emerald-700">
                                                            <CheckCircle2 size={12} className="inline mr-1" />Applied
                                                        </Badge>
                                                    )}
                                                    <Badge variant={isExpired ? 'bg-surface-100 text-surface-500' : 'bg-emerald-100 text-emerald-700'}>
                                                        {isExpired ? 'Closed' : 'Active'}
                                                    </Badge>
                                                    {drive.jobType && <Badge variant="bg-blue-50 text-blue-700">{drive.jobType}</Badge>}
                                                </div>
                                            </div>

                                            {drive.description && (
                                                <p className="text-sm text-surface-600 mt-2 line-clamp-2">{drive.description}</p>
                                            )}

                                            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-surface-500">
                                                <span className="flex items-center gap-1.5">
                                                    <IndianRupee size={14} className="text-surface-400" />
                                                    <span className="font-semibold text-surface-700">{formatSalary(drive.salary)}</span>
                                                    {drive.ctcPeriod && <span className="text-xs">/{drive.ctcPeriod}</span>}
                                                </span>
                                                {drive.location && (
                                                    <span className="flex items-center gap-1.5">
                                                        <MapPin size={14} className="text-surface-400" /> {drive.location}
                                                    </span>
                                                )}
                                                {drive.deadline && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar size={14} className="text-surface-400" />
                                                        {new Date(drive.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                                {drive.vacancies > 0 && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Users size={14} className="text-surface-400" /> {drive.vacancies} vacancies
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="flex items-center justify-between px-5 py-3 bg-surface-50 border-t border-surface-100">
                                    <div className="flex items-center gap-3 text-xs text-surface-500">
                                        {drive.CGPA > 0 && <span>CGPA ≥ {drive.CGPA}</span>}
                                        {drive.Backlogs >= 0 && <span>· Backlogs ≤ {drive.Backlogs}</span>}
                                        {drive.department.length > 0 && (
                                            <>
                                                <span className="text-surface-300">|</span>
                                                <span>{drive.department.join(', ')}</span>
                                            </>
                                        )}
                                        {drive.studyingYear && (
                                            <>
                                                <span className="text-surface-300">|</span>
                                                <span className="flex items-center gap-1"><GraduationCap size={12} /> {drive.studyingYear} Year</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isExpired && daysLeft >= 0 && (
                                            <span className={`text-xs font-medium ${daysLeft <= 7 ? 'text-rose-500' : 'text-amber-600'}`}>
                                                <Clock size={12} className="inline mr-1" />{daysLeft} days left
                                            </span>
                                        )}
                                        {drive.externalLink && (
                                            <a href={drive.externalLink} target="_blank" rel="noopener noreferrer">
                                                <Button size="sm" variant="ghost">
                                                    <ExternalLink size={14} /> View JD
                                                </Button>
                                            </a>
                                        )}
                                        {isApplied ? (
                                            <Button size="sm" variant="secondary" disabled>
                                                <CheckCircle2 size={14} className="text-emerald-600" /> Applied
                                            </Button>
                                        ) : (
                                            <Button size="sm" onClick={() => setApplyingTo(drive)} disabled={isExpired}>
                                                {isExpired ? 'Closed' : 'Apply Now'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card>
                    <EmptyState
                        icon={<Briefcase size={28} />}
                        title="No drives found"
                        description={searchQuery || deptFilter ? 'Try adjusting your search or filters.' : 'No placement drives available right now. Check back later.'}
                    />
                </Card>
            )}

            {/* Apply Modal */}
            <Modal
                isOpen={applyingTo !== null}
                onClose={() => setApplyingTo(null)}
                title={applyingTo ? `Apply — ${applyingTo.title}` : 'Apply'}
                size="xl"
            >
                {applyingTo && (
                    <ApplyModal
                        drive={applyingTo}
                        profile={profile}
                        fetcher={fetcher}
                        onClose={() => setApplyingTo(null)}
                    />
                )}
            </Modal>
        </div>
    );
}