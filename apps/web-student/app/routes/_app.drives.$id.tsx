import { AlertCircle, Building2, Calendar, CheckCircle2, Clock, ExternalLink, IndianRupee, MapPin, Send, Users } from 'lucide-react';
import { Badge, Button, Card, Avatar } from '@careernest/ui';
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { api } from '@careernest/lib';
import { requireUserSession } from '~/auth.server';

export const meta: MetaFunction = () => [{ title: 'Drive Details – Student – CareerNest' }];

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

interface ApplyProfile {
    phoneNumber?: string;
    city?: string;
    department?: string;
    currentYear?: string;
    cgpa?: string;
    skills?: string[];
}

type ActionData = {
    error?: string;
};

const DEGREE_OPTIONS = ['B.Tech', 'M.Tech', 'BCA', 'MCA', 'BSc', 'MSc', 'MBA', 'PhD', 'Diploma', 'Other'] as const;
const ACADEMIC_YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate'] as const;

function formatSalary(salary: number): string {
    if (salary >= 100000) return `Rs ${(salary / 100000).toFixed(1)} LPA`;
    if (salary > 0) return `Rs ${salary.toLocaleString('en-IN')}`;
    return 'Not disclosed';
}

function getDaysLeft(deadline: string): number {
    if (!deadline) return -1;
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function loader({ request, params }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const driveId = params.id;

    if (!driveId) {
        throw new Response('Drive not found', { status: 404 });
    }

    const [driveRes, applicationsRes, profileRes] = await Promise.all([
        api.drives.getById(token, driveId),
        api.applications.list(token, 'limit=500').catch(() => ({ data: [] })),
        api.students.getMyProfile(token).catch(() => null),
    ]) as [any, any, any];

    const driveData = driveRes?.data;
    if (!driveData) {
        throw new Response('Drive not found', { status: 404 });
    }

    const companyRef = driveData.companies;
    const companyName = Array.isArray(companyRef)
        ? (companyRef[0]?.name || 'Unknown Company')
        : (companyRef?.name || 'Unknown Company');

    const drive: Drive = {
        id: driveData.$id || driveData.id || '',
        title: driveData.title || '',
        company: companyName,
        salary: driveData.salary ?? 0,
        location: driveData.location || '',
        department: Array.isArray(driveData.department) ? driveData.department : (driveData.department ? [driveData.department] : []),
        CGPA: driveData.CGPA ?? 0,
        Backlogs: driveData.Backlogs ?? 0,
        deadline: driveData.deadline || '',
        vacancies: driveData.vacancies ?? 0,
        jobType: driveData.jobType || '',
        jobLevel: driveData.jobLevel || '',
        experience: driveData.experience || 'fresher',
        ctcPeriod: driveData.ctcPeriod || 'annual',
        studyingYear: driveData.studyingYear || '',
        description: driveData.description || '',
        externalLink: driveData.externalLink || '',
    };

    const appliedDriveIds = (applicationsRes?.data || []).map((app: any) => app.driveId as string);
    const alreadyApplied = appliedDriveIds.includes(drive.id);

    const profile: ApplyProfile = (profileRes as any)?.data
        ? {
            phoneNumber: (profileRes as any).data.identity?.phoneNumber || '',
            city: (profileRes as any).data.summary?.city || '',
            department: (profileRes as any).data.identity?.departmentName || '',
            currentYear: (profileRes as any).data.summary?.currentYear || '',
            cgpa: (profileRes as any).data.summary?.cgpa || '',
            skills: (profileRes as any).data.summary?.skills || [],
        }
        : {};

    return json({ drive, alreadyApplied, profile });
}

export async function action({ request, params }: ActionFunctionArgs) {
    const { token } = await requireUserSession(request);
    const driveId = params.id;

    if (!driveId) {
        return json<ActionData>({ error: 'Drive ID is required' }, { status: 400 });
    }

    const formData = await request.formData();
    const agreedToTerms = formData.get('agreedToTerms') === 'on';

    if (!agreedToTerms) {
        return json<ActionData>({ error: 'You must agree to the terms and conditions to apply.' }, { status: 400 });
    }

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
        return redirect(`/drives/${driveId}?applied=1`);
    } catch (error: any) {
        return json<ActionData>({ error: error?.message || 'Failed to submit application. Please try again.' }, { status: 400 });
    }
}

export default function DriveDetailsAndApplyPage() {
    const { drive, alreadyApplied, profile } = useLoaderData<typeof loader>() as {
        drive: Drive;
        alreadyApplied: boolean;
        profile: ApplyProfile;
    };
    const actionData = useActionData<typeof action>() as ActionData | undefined;
    const navigation = useNavigation();
    const isSubmitting = navigation.state !== 'idle';

    const [defaultGraduationYear] = [new Date().getFullYear() + 1];
    const daysLeft = getDaysLeft(drive.deadline);
    const isExpired = daysLeft < 0;
    const blocked = alreadyApplied || isExpired;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">Drive Details</p>
                    <h1 className="mt-1 text-2xl font-bold text-surface-900">{drive.title}</h1>
                    <p className="mt-1 text-sm text-surface-500 flex items-center gap-1"><Building2 size={14} /> {drive.company}</p>
                </div>
                <Link to="/drives">
                    <Button variant="ghost">Back to Drives</Button>
                </Link>
            </div>

            <Card className="student-surface-card !p-5">
                <div className="flex items-start gap-4">
                    <Avatar name={drive.company || drive.title} size="lg" />
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={isExpired ? 'bg-surface-100 text-surface-500' : 'bg-emerald-100 text-emerald-700'}>
                                {isExpired ? 'Closed' : 'Active'}
                            </Badge>
                            {alreadyApplied && (
                                <Badge variant="bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 size={12} className="inline mr-1" /> Applied
                                </Badge>
                            )}
                            {drive.jobType && <Badge variant="bg-blue-50 text-blue-700">{drive.jobType}</Badge>}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-surface-600">
                            <span className="flex items-center gap-1.5"><IndianRupee size={14} /> {formatSalary(drive.salary)}</span>
                            {drive.location && <span className="flex items-center gap-1.5"><MapPin size={14} /> {drive.location}</span>}
                            {drive.deadline && (
                                <span className="flex items-center gap-1.5"><Calendar size={14} />
                                    {new Date(drive.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            )}
                            {drive.vacancies > 0 && <span className="flex items-center gap-1.5"><Users size={14} /> {drive.vacancies} openings</span>}
                            {!isExpired && daysLeft >= 0 && (
                                <span className={`flex items-center gap-1.5 ${daysLeft <= 7 ? 'text-rose-500' : 'text-amber-600'}`}>
                                    <Clock size={14} /> {daysLeft} days left
                                </span>
                            )}
                        </div>
                        {drive.description && (
                            <p className="mt-4 text-sm leading-6 text-surface-700 whitespace-pre-line">{drive.description}</p>
                        )}
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-surface-500">
                            {drive.CGPA > 0 && <span>CGPA {'>='} {drive.CGPA}</span>}
                            {drive.Backlogs > 0 && <span>Max Backlogs: {drive.Backlogs}</span>}
                            {drive.department.length > 0 && <span>Departments: {drive.department.join(', ')}</span>}
                            {drive.studyingYear && <span>Study Year: {drive.studyingYear}</span>}
                        </div>
                        {drive.externalLink && (
                            <a href={drive.externalLink} target="_blank" rel="noopener noreferrer" className="inline-block mt-4">
                                <Button variant="ghost" size="sm"><ExternalLink size={14} /> View JD</Button>
                            </a>
                        )}
                    </div>
                </div>
            </Card>

            <Card className="student-surface-card !p-5">
                <h2 className="text-lg font-semibold text-surface-900">Apply To This Drive</h2>
                <p className="mt-1 text-sm text-surface-500">
                    Required fields are auto-filled from your student profile when available. You can edit any pre-filled value before submission.
                </p>

                {actionData?.error && (
                    <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                        <AlertCircle size={15} className="flex-shrink-0" /> {actionData.error}
                    </div>
                )}

                {alreadyApplied && (
                    <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                        <CheckCircle2 size={15} className="flex-shrink-0" /> You already applied to this drive.
                    </div>
                )}

                {isExpired && (
                    <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-surface-50 border border-surface-200 text-surface-600 text-sm">
                        <Clock size={15} className="flex-shrink-0" /> This drive is closed. Applications are no longer accepted.
                    </div>
                )}

                <Form method="post" className="mt-6 space-y-6">
                    <p className="text-xs font-semibold text-surface-400 uppercase tracking-widest">1 · Contact Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Phone Number <span className="text-rose-500">*</span></label>
                            <input
                                name="phoneNumber"
                                type="tel"
                                required
                                defaultValue={profile.phoneNumber || ''}
                                placeholder="9876543210"
                                className="form-input w-full"
                                disabled={blocked}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Current City <span className="text-rose-500">*</span></label>
                            <input
                                name="currentCity"
                                type="text"
                                required
                                defaultValue={profile.city || ''}
                                placeholder="e.g. Pune"
                                className="form-input w-full"
                                disabled={blocked}
                            />
                        </div>
                    </div>

                    <hr className="border-surface-100" />

                    <p className="text-xs font-semibold text-surface-400 uppercase tracking-widest">2 · Academic Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Degree <span className="text-rose-500">*</span></label>
                            <select name="degree" required defaultValue="" className="form-input w-full" disabled={blocked}>
                                <option value="">Select degree</option>
                                {DEGREE_OPTIONS.map((degree) => <option key={degree} value={degree}>{degree}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Branch / Department <span className="text-rose-500">*</span></label>
                            <input
                                name="branch"
                                type="text"
                                required
                                defaultValue={profile.department || ''}
                                placeholder="e.g. Computer Science"
                                className="form-input w-full"
                                disabled={blocked}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Current Year <span className="text-rose-500">*</span></label>
                            <select name="academicYear" required defaultValue={profile.currentYear || ''} className="form-input w-full" disabled={blocked}>
                                <option value="">Select year</option>
                                {ACADEMIC_YEAR_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Graduation Year <span className="text-rose-500">*</span></label>
                            <input
                                name="graduationYear"
                                type="number"
                                required
                                min={2020}
                                max={2035}
                                defaultValue={defaultGraduationYear}
                                className="form-input w-full"
                                disabled={blocked}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">CGPA <span className="text-rose-500">*</span></label>
                            <input
                                name="cgpa"
                                type="number"
                                step="0.01"
                                required
                                min={0}
                                max={10}
                                defaultValue={profile.cgpa || ''}
                                placeholder="e.g. 7.50"
                                className="form-input w-full"
                                disabled={blocked}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Backlogs <span className="text-rose-500">*</span></label>
                            <select name="hasBacklogs" defaultValue="false" className="form-input w-full" disabled={blocked}>
                                <option value="false">No active backlogs</option>
                                <option value="true">Has active backlogs</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Backlog Count</label>
                            <input
                                name="backlogCount"
                                type="number"
                                min={0}
                                max={50}
                                defaultValue={0}
                                className="form-input w-full"
                                disabled={blocked}
                            />
                        </div>
                    </div>

                    <hr className="border-surface-100" />

                    <p className="text-xs font-semibold text-surface-400 uppercase tracking-widest">3 · Application Materials</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Key Skills <span className="text-xs text-surface-400 font-normal">(optional)</span></label>
                            <textarea
                                name="skills"
                                rows={2}
                                defaultValue={(profile.skills || []).join(', ')}
                                placeholder="e.g. Python, React, SQL"
                                className="form-input w-full resize-none"
                                maxLength={2000}
                                disabled={blocked}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Cover Letter <span className="text-xs text-surface-400 font-normal">(optional)</span></label>
                            <textarea
                                name="coverLetter"
                                rows={4}
                                placeholder="Tell the company why you are a great fit"
                                className="form-input w-full resize-none"
                                maxLength={5000}
                                disabled={blocked}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Resume URL <span className="text-xs text-surface-400 font-normal">(optional)</span></label>
                            <input
                                name="resumeFileId"
                                type="url"
                                placeholder="https://drive.google.com/your-resume"
                                className="form-input w-full"
                                disabled={blocked}
                            />
                        </div>
                    </div>

                    <hr className="border-surface-100" />

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" name="agreedToTerms" required className="mt-0.5 accent-primary-600" disabled={blocked} />
                        <span className="text-sm text-surface-600">
                            I confirm all information is accurate and can be shared with the recruiting company for this application.
                        </span>
                    </label>

                    <div className="flex items-center justify-end pt-2">
                        <Button type="submit" isLoading={isSubmitting} disabled={blocked || isSubmitting}>
                            <Send size={15} /> Submit Application
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
