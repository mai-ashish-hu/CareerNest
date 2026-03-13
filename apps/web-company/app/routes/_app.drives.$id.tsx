import { useState, useCallback } from 'react';
import {
    ArrowLeft, Users, CheckCircle2, XCircle, Calendar, Search,
    Award, GraduationCap, Mail, Video, Phone, MapPin, Clock
} from 'lucide-react';
import { Card, Modal, EmptyState } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, useFetcher, Link } from '@remix-run/react';
import { requireCompanyUserSession } from '~/utils/company.server';
import { api } from '@careernest/lib';
import type { ApplicationWithStudent, Interview } from '@careernest/shared';

export const meta: MetaFunction<typeof loader> = ({ data }) => [
    { title: `${(data as any)?.driveTitle || 'Drive'} – Candidates – CareerNest` },
];

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
    applied:             { label: 'Applied',             color: 'text-blue-700 bg-blue-50 border-blue-200' },
    under_review:        { label: 'Under Review',        color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
    shortlisted:         { label: 'Shortlisted',         color: 'text-purple-700 bg-purple-50 border-purple-200' },
    interview_scheduled: { label: 'Interview Scheduled', color: 'text-orange-700 bg-orange-50 border-orange-200' },
    selected:            { label: 'Selected',            color: 'text-green-700 bg-green-50 border-green-200' },
    rejected:            { label: 'Rejected',            color: 'text-red-700 bg-red-50 border-red-200' },
};

const VALID_TRANSITIONS: Record<string, string[]> = {
    applied:             ['under_review', 'rejected'],
    under_review:        ['shortlisted', 'rejected'],
    shortlisted:         ['interview_scheduled', 'rejected'],
    interview_scheduled: ['selected', 'rejected'],
    selected:            [],
    rejected:            [],
};

export async function loader({ request, params }: LoaderFunctionArgs) {
    const { token, user } = await requireCompanyUserSession(request);
    const driveId = params.id!;
    const url = new URL(request.url);
    const stage = url.searchParams.get('stage') || '';

    const [driveRes, applicationsRes, interviewsRes] = await Promise.all([
        api.drives.getById(token, driveId).catch(() => ({ data: null })) as any,
        api.applications.list(token, `driveId=${driveId}&limit=100${stage ? `&stage=${stage}` : ''}`).catch(() => ({ data: [], total: 0 })) as any,
        api.interviews.list(token, `driveId=${driveId}&limit=100`).catch(() => ({ data: [], total: 0 })) as any,
    ]);

    const drive = driveRes?.data || driveRes;
    const applications = applicationsRes.data || [];
    const interviews = interviewsRes.data || [];

    const interviewByApp = new Map<string, any>();
    for (const iv of interviews) {
        interviewByApp.set(iv.applicationId, iv);
    }

    // Enrich applications with student details
    const studentIds = [...new Set(applications.map((a: any) => a.studentId).filter(Boolean))];
    const studentMap = new Map<string, any>();
    if (studentIds.length > 0) {
        try {
            const sRes = await api.students.list(token, `limit=200`) as any;
            for (const s of (sRes.data || [])) {
                studentMap.set(s.$id, s);
            }
        } catch { /* ignore */ }
    }

    const enriched = applications.map((app: any) => {
        const student = studentMap.get(app.studentId) || {};
        return {
            ...app,
            student: {
                $id: app.studentId,
                name: student.name || app.studentName || '',
                email: student.email || '',
                departmentName: student.departmentName || '',
                cgpa: app.cgpa || student.cgpa || null,
                profilePicture: '',
                headline: '',
                isPlaced: student.isPlaced || false,
            },
        };
    });

    const stageCounts: Record<string, number> = { applied: 0, under_review: 0, shortlisted: 0, interview_scheduled: 0, selected: 0, rejected: 0 };
    for (const app of enriched) {
        if (stageCounts[app.stage] !== undefined) stageCounts[app.stage]++;
    }

    const driveTitle = drive?.title || 'Drive';

    return json({
        drive,
        driveTitle,
        applications: enriched,
        stageCounts,
        interviewByApplication: Object.fromEntries(interviewByApp),
        currentStage: stage,
        total: applicationsRes.total || enriched.length,
    });
}

export async function action({ request, params }: ActionFunctionArgs) {
    const { token } = await requireCompanyUserSession(request);
    const form = await request.formData();
    const intent = form.get('intent') as string;

    if (intent === 'update_stage') {
        const applicationId = form.get('applicationId') as string;
        const stage = form.get('stage') as string;
        try {
            await api.applications.updateStage(token, applicationId, stage);
            return json({ success: true });
        } catch (err: any) {
            return json({ error: err?.message || 'Failed to update' }, { status: 500 });
        }
    }

    if (intent === 'schedule_interview') {
        try {
            await api.interviews.create(token, {
                applicationId: form.get('applicationId') as string,
                scheduledAt: new Date(form.get('scheduledAt') as string).toISOString(),
                format: form.get('format') as string,
                durationMinutes: parseInt(form.get('durationMinutes') as string || '60'),
                interviewerName: (form.get('interviewerName') as string) || '',
                notes: (form.get('notes') as string) || '',
                meetingLink: (form.get('meetingLink') as string) || '',
            });
            return json({ success: true });
        } catch (err: any) {
            return json({ error: err?.message || 'Failed to schedule' }, { status: 500 });
        }
    }

    return json({ error: 'Unknown intent' }, { status: 400 });
}

function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

function CandidateCard({ app, interview, onSchedule }: {
    app: ApplicationWithStudent;
    interview?: any;
    onSchedule: (app: ApplicationWithStudent) => void;
}) {
    const fetcher = useFetcher();
    const cfg = STAGE_CONFIG[app.stage] || { label: app.stage, color: 'text-surface-700 bg-surface-50 border-surface-200' };
    const validNext = VALID_TRANSITIONS[app.stage] || [];
    const isLoading = fetcher.state !== 'idle';

    return (
        <div className="bg-white rounded-2xl border border-surface-200 p-5 hover:shadow-md transition-all">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {getInitials(app.student.name)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-surface-900 text-sm">{app.student.name || 'Unknown'}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-surface-500">
                        {app.student.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{app.student.email}</span>}
                        {app.student.departmentName && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{app.student.departmentName}</span>}
                        {app.cgpa != null && app.cgpa > 0 && <span className="flex items-center gap-1 text-blue-600"><Award className="w-3 h-3" />CGPA: {Number(app.cgpa).toFixed(2)}</span>}
                    </div>
                    {interview && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-700">
                            <Calendar className="w-3 h-3" />
                            {new Date(interview.scheduledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            {interview.roomId && (
                                <a href={`/interview/${interview.roomId}`} target="_blank" rel="noreferrer" className="ml-1 underline font-medium">Join</a>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                {validNext.map(nextStage => {
                    const isReject = nextStage === 'rejected';
                    const nextCfg = STAGE_CONFIG[nextStage];
                    return (
                        <fetcher.Form method="post" key={nextStage}>
                            <input type="hidden" name="intent" value="update_stage" />
                            <input type="hidden" name="applicationId" value={app.$id} />
                            <input type="hidden" name="stage" value={nextStage} />
                            <button type="submit" disabled={isLoading}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50
                                    ${isReject ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-blue-200 text-blue-600 hover:bg-blue-50'}`}>
                                {isReject ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                {isReject ? 'Reject' : nextCfg?.label}
                            </button>
                        </fetcher.Form>
                    );
                })}
                {app.stage === 'shortlisted' && !interview && (
                    <button onClick={() => onSchedule(app)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-200 text-purple-600 hover:bg-purple-50 transition-all">
                        <Video className="w-3 h-3" /> Schedule Interview
                    </button>
                )}
            </div>
        </div>
    );
}

function ScheduleModal({ app, onClose }: { app: ApplicationWithStudent | null; onClose: () => void }) {
    const fetcher = useFetcher();
    if (!app) return null;
    const successData = (fetcher.data as any);
    if (successData?.success) setTimeout(onClose, 100);
    return (
        <Modal isOpen={true} onClose={onClose} title="Schedule Interview" size="md">
            <fetcher.Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="schedule_interview" />
                <input type="hidden" name="applicationId" value={app.$id} />
                <div className="p-3 bg-surface-50 rounded-xl">
                    <p className="font-semibold text-sm text-surface-900">{app.student.name}</p>
                    <p className="text-xs text-surface-500">{app.student.email}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Date & Time *</label>
                    <input type="datetime-local" name="scheduledAt" required min={new Date().toISOString().slice(0, 16)}
                        className="w-full px-3 py-2 border border-surface-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1">Format *</label>
                        <select name="format" required defaultValue="video_call"
                            className="w-full px-3 py-2 border border-surface-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                            <option value="video_call">🎥 Video Call</option>
                            <option value="in_person">🏢 In Person</option>
                            <option value="phone">📞 Phone</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1">Duration</label>
                        <select name="durationMinutes" defaultValue="60"
                            className="w-full px-3 py-2 border border-surface-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                            <option value="30">30 min</option>
                            <option value="45">45 min</option>
                            <option value="60">1 hour</option>
                            <option value="90">1.5 hours</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Interviewer Name</label>
                    <input type="text" name="interviewerName" placeholder="Your name"
                        className="w-full px-3 py-2 border border-surface-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Instructions for Candidate</label>
                    <textarea name="notes" rows={2} placeholder="Any instructions..."
                        className="w-full px-3 py-2 border border-surface-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none" />
                </div>
                {successData?.error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{successData.error}</p>}
                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-surface-300 rounded-xl text-sm font-medium text-surface-700 hover:bg-surface-50">Cancel</button>
                    <button type="submit" disabled={fetcher.state !== 'idle'}
                        className="flex-1 px-4 py-2.5 bg-primary-600 rounded-xl text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                        {fetcher.state !== 'idle' ? 'Scheduling...' : 'Schedule'}
                    </button>
                </div>
            </fetcher.Form>
        </Modal>
    );
}

export default function CompanyDriveDetailPage() {
    const { drive, driveTitle, applications, stageCounts, interviewByApplication, currentStage, total } = useLoaderData<typeof loader>();
    const [search, setSearch] = useState('');
    const [interviewApp, setInterviewApp] = useState<ApplicationWithStudent | null>(null);

    const filtered = applications.filter((app: any) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            (app.student?.name || '').toLowerCase().includes(q) ||
            (app.student?.email || '').toLowerCase().includes(q) ||
            (app.student?.departmentName || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="min-h-screen bg-surface-50">
            {/* Header */}
            <div className="bg-white border-b border-surface-200 px-6 py-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-2 mb-2 text-sm text-surface-500">
                        <Link to="/drives" className="hover:text-surface-700">← Back to Drives</Link>
                    </div>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-surface-900">{driveTitle}</h1>
                            <p className="text-surface-500 text-sm mt-1">{total} total applicants</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-green-600">{stageCounts.selected}</div>
                            <div className="text-xs text-surface-500">Selected</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-6">
                {/* Stage Cards */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
                    {Object.entries(STAGE_CONFIG).map(([stage, cfg]) => (
                        <a key={stage} href={`?stage=${stage}`}
                            className={`p-3 rounded-xl border-2 text-center cursor-pointer transition-all
                                ${currentStage === stage ? `${cfg.color} border-current` : 'bg-white border-surface-200 hover:border-surface-300 text-surface-600'}`}>
                            <div className="text-xl font-bold">{(stageCounts as any)[stage] || 0}</div>
                            <div className="text-xs mt-0.5">{cfg.label}</div>
                        </a>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl border border-surface-200 p-4 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                            <input type="text" placeholder="Search candidates..." value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                        </div>
                        {currentStage && (
                            <a href="?" className="text-sm text-surface-500 hover:text-surface-700 flex items-center gap-1">
                                <XCircle className="w-4 h-4" /> Clear filter
                            </a>
                        )}
                    </div>
                </div>

                {/* Candidates */}
                {filtered.length === 0 ? (
                    <EmptyState
                        icon={<Users className="w-8 h-8" />}
                        title="No candidates found"
                        description={currentStage ? `No candidates in ${STAGE_CONFIG[currentStage]?.label} stage` : 'No applications yet for this drive'}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filtered.map((app: any) => (
                            <CandidateCard
                                key={app.$id}
                                app={app}
                                interview={(interviewByApplication as any)[app.$id]}
                                onSchedule={setInterviewApp}
                            />
                        ))}
                    </div>
                )}
            </div>

            <ScheduleModal app={interviewApp} onClose={() => setInterviewApp(null)} />
        </div>
    );
}
