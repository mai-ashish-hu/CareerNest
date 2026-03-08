import { useState } from 'react';
import { FileText, CheckCircle2, Clock, XCircle, Calendar, Briefcase } from 'lucide-react';
import { Card, Badge, EmptyState, Avatar, Tabs, ProgressSteps } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Applications – Student – CareerNest' }];

interface AppItem {
    id: string;
    driveTitle: string;
    company: string;
    stage: string;
    appliedAt: string;
    updatedAt: string;
}

const applicationStages = [
    { id: 'applied', label: 'Applied' },
    { id: 'under_review', label: 'Review' },
    { id: 'shortlisted', label: 'Shortlisted' },
    { id: 'interview_scheduled', label: 'Interview' },
    { id: 'selected', label: 'Selected' },
];

const stageLabels: Record<string, string> = {
    applied: 'Applied', under_review: 'Under Review', shortlisted: 'Shortlisted',
    interview_scheduled: 'Interview Scheduled', selected: 'Selected', rejected: 'Rejected',
};
const stageColors: Record<string, string> = {
    applied: 'bg-blue-100 text-blue-700', under_review: 'bg-amber-100 text-amber-700',
    shortlisted: 'bg-cyan-100 text-cyan-700', interview_scheduled: 'bg-purple-100 text-purple-700',
    selected: 'bg-emerald-100 text-emerald-700', rejected: 'bg-rose-100 text-rose-700',
};

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    const tenantId = user.tenantId;

    // Fetch student's own applications (backend auto-filters by studentId for students)
    const [appsRes, drivesRes] = await Promise.all([
        api.applications.list(token, 'limit=100').catch(() => ({ data: [], total: 0 })) as Promise<{ data: any[]; total: number }>,
        api.drives.list(token, `${tenantId ? `tenantId=${tenantId}&` : ''}limit=500`).catch(() => ({ data: [] })) as Promise<{ data: any[] }>,
    ]);

    // Build a map of drive details for enrichment (company name comes from drive relationship)
    const driveMap = new Map<string, { title: string; company: string }>();
    for (const d of (drivesRes.data || [])) {
        const companyRef = d.companies;
        const companyName = Array.isArray(companyRef)
            ? (companyRef[0]?.name || 'Unknown Company')
            : (companyRef?.name || 'Unknown Company');
        driveMap.set(d.$id, {
            title: d.title || '',
            company: companyName,
        });
    }

    const applications: AppItem[] = (appsRes.data || []).map((a: any) => {
        const drive = driveMap.get(a.driveId) || { title: 'Unknown Drive', company: '' };
        return {
            id: a.$id || '',
            driveTitle: drive.title,
            company: drive.company,
            stage: a.stage || 'applied',
            appliedAt: a.appliedAt || a.$createdAt || '',
            updatedAt: a.$updatedAt || '',
        };
    });

    return json({ applications });
}

export default function Applications() {
    const { applications } = useLoaderData<typeof loader>() as { applications: AppItem[] };
    const [activeTab, setActiveTab] = useState('all');

    const tabs = [
        { id: 'all', label: 'All', count: applications.length },
        { id: 'active', label: 'In Progress', count: applications.filter(a => !['selected', 'rejected'].includes(a.stage)).length },
        { id: 'selected', label: 'Selected', count: applications.filter(a => a.stage === 'selected').length },
        { id: 'rejected', label: 'Rejected', count: applications.filter(a => a.stage === 'rejected').length },
    ];

    const filtered = applications.filter((a) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'active') return !['selected', 'rejected'].includes(a.stage);
        return a.stage === activeTab;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-surface-900">My Applications</h1>
                <p className="text-surface-500 mt-1">Track your placement application status in real-time</p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><FileText size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{applications.length}</p>
                            <p className="text-xs text-surface-500">Total Applied</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><Clock size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{applications.filter(a => !['selected', 'rejected'].includes(a.stage)).length}</p>
                            <p className="text-xs text-surface-500">In Progress</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{applications.filter(a => a.stage === 'selected').length}</p>
                            <p className="text-xs text-surface-500">Selected</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-rose-50 text-rose-600"><XCircle size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{applications.filter(a => a.stage === 'rejected').length}</p>
                            <p className="text-xs text-surface-500">Rejected</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            {/* Application Cards */}
            {filtered.length > 0 ? (
                <div className="space-y-4">
                    {filtered.map((app) => (
                        <Card key={app.id} className="!p-0 overflow-hidden">
                            <div className="p-5">
                                <div className="flex items-center gap-4">
                                    <Avatar name={app.company || app.driveTitle} size="md" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold text-surface-900">{app.driveTitle}</h3>
                                                {app.company && <p className="text-sm text-surface-500">{app.company}</p>}
                                            </div>
                                            <Badge variant={stageColors[app.stage] || 'bg-surface-100 text-surface-600'}>
                                                {stageLabels[app.stage] || app.stage}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-surface-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} /> Applied {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '–'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} /> Updated {app.updatedAt ? new Date(app.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '–'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Steps */}
                                {app.stage !== 'rejected' && (
                                    <div className="mt-4 pt-4 border-t border-surface-100">
                                        <ProgressSteps steps={applicationStages} currentStep={app.stage} />
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <EmptyState
                        icon={<Briefcase size={28} />}
                        title="No applications yet"
                        description={activeTab === 'all' ? "You haven't applied to any placement drives yet. Browse drives to get started!" : "No applications in this category."}
                    />
                </Card>
            )}
        </div>
    );
}
