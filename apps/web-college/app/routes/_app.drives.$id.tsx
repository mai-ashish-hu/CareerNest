import { useState, useCallback } from 'react';
import {
    ArrowLeft, Users, CheckCircle2, XCircle, Clock, Calendar, Search,
    ChevronDown, Award, GraduationCap, Phone, Mail, Briefcase, Eye,
    Filter, Download, UserCheck, MessageSquare, Video, Building2,
    TrendingUp, AlertCircle
} from 'lucide-react';
import { Button, Card, Badge, Avatar, Modal, EmptyState, Tabs } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, useFetcher, Link } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';
import type { ApplicationWithStudent, ApplicationStage, Interview } from '@careernest/shared';

export const meta: MetaFunction<typeof loader> = ({ data }) => [
    { title: `${(data as any)?.drive?.title || 'Drive'} – Applications – CareerNest` },
];

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    applied:              { label: 'Applied',              color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200',  icon: '📋' },
    under_review:         { label: 'Under Review',         color: 'text-yellow-700',bg: 'bg-yellow-50 border-yellow-200', icon: '🔍' },
    shortlisted:          { label: 'Shortlisted',          color: 'text-purple-700',bg: 'bg-purple-50 border-purple-200', icon: '⭐' },
    interview_scheduled:  { label: 'Interview Scheduled',  color: 'text-orange-700',bg: 'bg-orange-50 border-orange-200', icon: '📅' },
    selected:             { label: 'Selected',             color: 'text-green-700', bg: 'bg-green-50 border-green-200',  icon: '✅' },
    rejected:             { label: 'Rejected',             color: 'text-red-700',   bg: 'bg-red-50 border-red-200',     icon: '❌' },
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
    const { token, user } = await requireUserSession(request);
    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) {
        throw redirect('/login');
    }

    const driveId = params.id!;
    const url = new URL(request.url);
    const stage = url.searchParams.get('stage') || '';
    const page = parseInt(url.searchParams.get('page') || '1');

    const [driveRes, applicationsRes, interviewsRes] = await Promise.all([
        api.drives.getById(token, driveId).catch(() => ({ data: null })) as Promise<{ data: any }>,
        api.drives.getApplications(token, driveId, `page=${page}&limit=50${stage ? `&stage=${stage}` : ''}`).catch(() => ({ data: [], total: 0, page: 1, limit: 50 })) as Promise<{ data: any[]; total: number; page: number; limit: number }>,
        api.interviews.list(token, `driveId=${driveId}&limit=100`).catch(() => ({ data: [], total: 0 })) as Promise<{ data: any[]; total: number }>,
    ]);

    const drive = (driveRes as any).data || driveRes;
    const applications: ApplicationWithStudent[] = (applicationsRes.data || []);
    const interviews: Interview[] = (interviewsRes.data || []);

    // Build a map of applicationId → interview
    const interviewByApplication = new Map<string, any>();
    for (const iv of interviews) {
        interviewByApplication.set(iv.applicationId, iv);
    }

    // Stage counts from applications
    const stageCounts: Record<string, number> = {
        applied: 0, under_review: 0, shortlisted: 0, interview_scheduled: 0, selected: 0, rejected: 0,
    };

    // We need total counts — fetch a summary by getting ALL applications (without stage filter)
    try {
        const allApps = await api.drives.getApplications(token, driveId, 'page=1&limit=1000') as any;
        for (const app of (allApps.data || [])) {
            const s = app.stage as string;
            if (stageCounts[s] !== undefined) stageCounts[s]++;
        }
    } catch {
        // fallback - count from current page
        for (const app of applications) {
            const s = app.stage as string;
            if (stageCounts[s] !== undefined) stageCounts[s]++;
        }
    }

    return json({
        drive,
        applications,
        total: applicationsRes.total,
        stageCounts,
        interviewByApplication: Object.fromEntries(interviewByApplication),
        currentStageFilter: stage,
        currentPage: page,
    });
}

export async function action({ request, params }: ActionFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    const form = await request.formData();
    const intent = form.get('intent') as string;

    if (intent === 'update_stage') {
        const applicationId = form.get('applicationId') as string;
        const stage = form.get('stage') as string;
        try {
            await api.applications.updateStage(token, applicationId, stage);
            return json({ success: true });
        } catch (err: any) {
            return json({ error: err?.message || 'Failed to update stage' }, { status: 500 });
        }
    }

    if (intent === 'schedule_interview') {
        const applicationId = form.get('applicationId') as string;
        const scheduledAt = form.get('scheduledAt') as string;
        const format = form.get('format') as string;
        const durationMinutes = parseInt(form.get('durationMinutes') as string || '60');
        const interviewerName = form.get('interviewerName') as string;
        const interviewerEmail = form.get('interviewerEmail') as string;
        const notes = form.get('notes') as string;
        const meetingLink = form.get('meetingLink') as string;

        try {
            await api.interviews.create(token, {
                applicationId,
                scheduledAt: new Date(scheduledAt).toISOString(),
                format,
                durationMinutes,
                interviewerName: interviewerName || '',
                interviewerEmail: interviewerEmail || '',
                notes: notes || '',
                meetingLink: meetingLink || '',
            });
            return json({ success: true, action: 'interview_scheduled' });
        } catch (err: any) {
            return json({ error: err?.message || 'Failed to schedule interview' }, { status: 500 });
        }
    }

    if (intent === 'bulk_update') {
        const applicationIds = (form.get('applicationIds') as string).split(',').filter(Boolean);
        const stage = form.get('stage') as string;
        const errors: string[] = [];

        await Promise.allSettled(
            applicationIds.map(async (id) => {
                try {
                    await api.applications.updateStage(token, id, stage);
                } catch (err: any) {
                    errors.push(`${id}: ${err?.message}`);
                }
            })
        );

        if (errors.length > 0) {
            return json({ success: true, warning: `${errors.length} updates failed` });
        }
        return json({ success: true });
    }

    return json({ error: 'Unknown intent' }, { status: 400 });
}

// ─── Helpers ───────────────────────────────────────────────
function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

function formatDate(iso: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// ─── Sub-components ─────────────────────────────────────────
function StagePill({ stage }: { stage: string }) {
    const cfg = STAGE_CONFIG[stage] || { label: stage, color: 'text-surface-600', bg: 'bg-surface-50 border-surface-200', icon: '•' };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
            {cfg.icon} {cfg.label}
        </span>
    );
}

function ApplicationCard({
    app,
    interview,
    onStageChange,
    onScheduleInterview,
    selected,
    onSelect,
}: {
    app: ApplicationWithStudent;
    interview?: any;
    onStageChange: (appId: string, stage: string) => void;
    onScheduleInterview: (app: ApplicationWithStudent) => void;
    selected: boolean;
    onSelect: (id: string) => void;
}) {
    const validNext = VALID_TRANSITIONS[app.stage] || [];
    const fetcher = useFetcher();
    const isLoading = fetcher.state !== 'idle';

    return (
        <div className={`bg-white rounded-xl border-2 transition-all duration-150 hover:shadow-md ${selected ? 'border-blue-400 shadow-blue-100 shadow-md' : 'border-transparent hover:border-surface-200'}`}>
            <div className="p-5">
                <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-surface-300 text-primary-600 cursor-pointer"
                        checked={selected}
                        onChange={() => onSelect(app.$id)}
                    />
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        {app.student.profilePicture ? (
                            <img src={app.student.profilePicture} alt={app.student.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow" />
                        ) : (
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold ring-2 ring-white shadow">
                                {getInitials(app.student.name)}
                            </div>
                        )}
                        {app.student.isPlaced && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                            </span>
                        )}
                    </div>
                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h4 className="font-semibold text-surface-900 text-sm leading-tight">{app.student.name || 'Unknown Student'}</h4>
                                {app.student.headline && (
                                    <p className="text-xs text-surface-500 mt-0.5">{app.student.headline}</p>
                                )}
                            </div>
                            <StagePill stage={app.stage} />
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-surface-500">
                            {app.student.email && (
                                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{app.student.email}</span>
                            )}
                            {app.student.departmentName && (
                                <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{app.student.departmentName}</span>
                            )}
                            {app.student.cgpa != null && app.student.cgpa > 0 && (
                                <span className="flex items-center gap-1"><Award className="w-3 h-3" />CGPA: {Number(app.student.cgpa).toFixed(2)}</span>
                            )}
                            {app.cgpa != null && app.cgpa > 0 && (
                                <span className="flex items-center gap-1 text-primary-600 font-medium"><Award className="w-3 h-3" />Applied CGPA: {Number(app.cgpa).toFixed(2)}</span>
                            )}
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Applied {formatDate(app.appliedAt)}</span>
                        </div>

                        {/* Interview info */}
                        {interview && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-700">
                                <Calendar className="w-3 h-3" />
                                Interview: {formatDateTime(interview.scheduledAt)}
                                {interview.format === 'video_call' && interview.roomId && (
                                    <a href={`/interview/${interview.roomId}`} target="_blank" rel="noreferrer"
                                        className="ml-1 text-orange-600 hover:text-orange-800 underline font-medium">
                                        Join
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
                    {validNext.length > 0 && validNext.map(nextStage => {
                        const cfg = STAGE_CONFIG[nextStage];
                        const isReject = nextStage === 'rejected';
                        return (
                            <fetcher.Form method="post" key={nextStage} className="inline">
                                <input type="hidden" name="intent" value="update_stage" />
                                <input type="hidden" name="applicationId" value={app.$id} />
                                <input type="hidden" name="stage" value={nextStage} />
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                                        ${isReject
                                            ? 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                                            : 'border-blue-200 text-primary-600 hover:bg-blue-50 hover:border-blue-300'
                                        } disabled:opacity-50`}
                                >
                                    {isLoading ? (
                                        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        isReject ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />
                                    )}
                                    Move to {cfg.label}
                                </button>
                            </fetcher.Form>
                        );
                    })}
                    {app.stage === 'shortlisted' && !interview && (
                        <button
                            onClick={() => onScheduleInterview(app)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 transition-all"
                        >
                            <Video className="w-3 h-3" /> Schedule Interview
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function InterviewModal({
    app,
    onClose,
    onSubmit,
}: {
    app: ApplicationWithStudent | null;
    onClose: () => void;
    onSubmit: (formData: FormData) => void;
}) {
    const fetcher = useFetcher();
    if (!app) return null;

    return (
        <Modal isOpen={true} onClose={onClose} title="Schedule Interview" size="md">
            <fetcher.Form
                method="post"
                onSubmit={(e) => {
                    // Allow native submit but also call onSubmit to close modal
                    setTimeout(onClose, 300);
                }}
            >
                <input type="hidden" name="intent" value="schedule_interview" />
                <input type="hidden" name="applicationId" value={app.$id} />

                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                            {getInitials(app.student.name)}
                        </div>
                        <div>
                            <p className="font-semibold text-surface-900 text-sm">{app.student.name}</p>
                            <p className="text-xs text-surface-500">{app.student.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-surface-700 mb-1">Interview Date & Time *</label>
                            <input
                                type="datetime-local"
                                name="scheduledAt"
                                required
                                className="w-full px-3 py-2 border border-surface-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                min={new Date().toISOString().slice(0, 16)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Format *</label>
                            <select
                                name="format"
                                required
                                defaultValue="video_call"
                                className="w-full px-3 py-2 border border-surface-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                <option value="video_call">🎥 Video Call (Platform)</option>
                                <option value="in_person">🏢 In Person</option>
                                <option value="phone">📞 Phone</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Duration (mins)</label>
                            <select
                                name="durationMinutes"
                                defaultValue="60"
                                className="w-full px-3 py-2 border border-surface-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                <option value="30">30 minutes</option>
                                <option value="45">45 minutes</option>
                                <option value="60">1 hour</option>
                                <option value="90">1.5 hours</option>
                                <option value="120">2 hours</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-surface-700 mb-1">Interviewer Name</label>
                            <input
                                type="text"
                                name="interviewerName"
                                placeholder="e.g., Rajesh Kumar"
                                className="w-full px-3 py-2 border border-surface-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-surface-700 mb-1">External Meeting Link (optional)</label>
                            <input
                                type="url"
                                name="meetingLink"
                                placeholder="https://meet.google.com/... or leave blank for platform"
                                className="w-full px-3 py-2 border border-surface-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-surface-700 mb-1">Notes for Candidate</label>
                            <textarea
                                name="notes"
                                rows={3}
                                placeholder="Any instructions or notes for the candidate..."
                                className="w-full px-3 py-2 border border-surface-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-surface-300 rounded-xl text-sm font-medium text-surface-700 hover:bg-surface-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-primary-600 rounded-xl text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                        >
                            Schedule Interview
                        </button>
                    </div>
                </div>
            </fetcher.Form>
        </Modal>
    );
}

// ─── Main Component ──────────────────────────────────────────
export default function DriveApplicationsPage() {
    const { drive, applications, stageCounts, interviewByApplication, currentStageFilter, total } = useLoaderData<typeof loader>();
    const fetcher = useFetcher();

    const [search, setSearch] = useState('');
    const [interviewApp, setInterviewApp] = useState<ApplicationWithStudent | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkStage, setBulkStage] = useState('');
    const [showBulkConfirm, setShowBulkConfirm] = useState(false);

    const driveObj = (drive as any)?.data || drive as any;
    const driveTitle = driveObj?.title || 'Drive';
    const companyRef = driveObj?.companies;
    const companyName = Array.isArray(companyRef)
        ? (companyRef[0]?.name || 'Unknown Company')
        : (companyRef?.name || 'Unknown Company');

    const filteredApps = applications.filter(app => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            (app.student.name || '').toLowerCase().includes(q) ||
            (app.student.email || '').toLowerCase().includes(q) ||
            (app.student.departmentName || '').toLowerCase().includes(q)
        );
    });

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    }, []);

    const selectAll = () => setSelectedIds(new Set(filteredApps.map(a => a.$id)));
    const clearSelection = () => setSelectedIds(new Set());

    const handleBulkAction = () => {
        if (!bulkStage || selectedIds.size === 0) return;
        const form = new FormData();
        form.set('intent', 'bulk_update');
        form.set('applicationIds', Array.from(selectedIds).join(','));
        form.set('stage', bulkStage);
        fetcher.submit(form, { method: 'post' });
        setSelectedIds(new Set());
        setShowBulkConfirm(false);
    };

    const totalApps = Object.values(stageCounts).reduce((a, b) => a + b, 0);
    const selectedCount = Object.values(stageCounts).filter((_, i) =>
        ['selected'].includes(Object.keys(stageCounts)[i])
    ).reduce((a, b) => a + b, 0);

    return (
        <div className="min-h-screen bg-surface-50">
            {/* Header */}
            <div className="bg-white border-b border-surface-200 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 mb-1">
                        <Link to="/drives" className="text-surface-400 hover:text-surface-600 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <span className="text-surface-400">/</span>
                        <span className="text-sm text-surface-500">Drives</span>
                        <span className="text-surface-400">/</span>
                        <span className="text-sm text-surface-700 font-medium">{driveTitle}</span>
                    </div>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-surface-900">{driveTitle}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Building2 className="w-4 h-4 text-surface-400" />
                                <span className="text-sm text-surface-500">{companyName}</span>
                                <span className="text-surface-300">•</span>
                                <Users className="w-4 h-4 text-surface-400" />
                                <span className="text-sm text-surface-500">{totalApps} applicants</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-green-600">{stageCounts.selected}</div>
                            <div className="text-sm text-surface-500">Selected</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Stage Summary Cards */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
                    {Object.entries(STAGE_CONFIG).map(([stage, cfg]) => (
                        <a
                            key={stage}
                            href={stage ? `?stage=${stage}` : '?'}
                            className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer
                                ${currentStageFilter === stage
                                    ? `${cfg.bg} ${cfg.color} border-current`
                                    : 'bg-white border-surface-200 hover:border-surface-300 text-surface-600'}`}
                        >
                            <div className="text-xl font-bold">{stageCounts[stage] || 0}</div>
                            <div className="text-xs mt-0.5 font-medium">{cfg.label}</div>
                        </a>
                    ))}
                </div>

                {/* Search + Bulk Actions */}
                <div className="bg-white rounded-2xl border border-surface-200 p-4 mb-5">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, department..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 text-sm border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>

                        {currentStageFilter && (
                            <a href="?" className="inline-flex items-center gap-1 px-3 py-2 text-sm text-surface-600 border border-surface-300 rounded-xl hover:bg-surface-50">
                                <XCircle className="w-4 h-4" /> Clear Filter
                            </a>
                        )}

                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-2 ml-auto">
                                <span className="text-sm text-primary-600 font-medium">{selectedIds.size} selected</span>
                                <select
                                    value={bulkStage}
                                    onChange={e => setBulkStage(e.target.value)}
                                    className="px-3 py-2 text-sm border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="">Move to stage...</option>
                                    <option value="under_review">Under Review</option>
                                    <option value="shortlisted">Shortlisted</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                                <button
                                    disabled={!bulkStage}
                                    onClick={() => setShowBulkConfirm(true)}
                                    className="px-4 py-2 bg-primary-600 text-white text-sm rounded-xl disabled:opacity-50 hover:bg-primary-700 transition-colors"
                                >
                                    Apply
                                </button>
                                <button onClick={clearSelection} className="px-3 py-2 text-sm text-surface-500 hover:text-surface-700">
                                    Clear
                                </button>
                            </div>
                        )}

                        {selectedIds.size === 0 && filteredApps.length > 0 && (
                            <button onClick={selectAll} className="ml-auto text-sm text-primary-600 hover:text-blue-700 font-medium">
                                Select All ({filteredApps.length})
                            </button>
                        )}
                    </div>
                </div>

                {/* Application List */}
                {filteredApps.length === 0 ? (
                    <EmptyState
                        icon={<Users className="w-8 h-8" />}
                        title={currentStageFilter ? `No ${STAGE_CONFIG[currentStageFilter]?.label} applications` : 'No applications yet'}
                        description={currentStageFilter ? 'Try a different stage filter' : 'Applications will appear here once students apply'}
                    />
                ) : (
                    <div className="space-y-3">
                        {filteredApps.map(app => (
                            <ApplicationCard
                                key={app.$id}
                                app={app}
                                interview={(interviewByApplication as any)[app.$id]}
                                onStageChange={() => {}}
                                onScheduleInterview={setInterviewApp}
                                selected={selectedIds.has(app.$id)}
                                onSelect={toggleSelect}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Interview Scheduler Modal */}
            <InterviewModal
                app={interviewApp}
                onClose={() => setInterviewApp(null)}
                onSubmit={() => {}}
            />

            {/* Bulk Confirm Modal */}
            {showBulkConfirm && (
                <Modal isOpen={true} onClose={() => setShowBulkConfirm(false)} title="Confirm Bulk Update">
                    <p className="text-surface-600 text-sm mb-4">
                        You are about to move <strong>{selectedIds.size} application(s)</strong> to{' '}
                        <strong>{STAGE_CONFIG[bulkStage]?.label}</strong>. This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowBulkConfirm(false)} className="flex-1 px-4 py-2 border border-surface-300 rounded-xl text-sm text-surface-700 hover:bg-surface-50">
                            Cancel
                        </button>
                        <button onClick={handleBulkAction} className="flex-1 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700">
                            Confirm
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
