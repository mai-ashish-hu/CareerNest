import { useState } from 'react';
import { Calendar, Video, CheckCircle2, XCircle, Clock, Users, MessageSquare } from 'lucide-react';
import { Card, EmptyState, Modal } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { requireCompanyUserSession } from '~/utils/company.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Interviews – Company – CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireCompanyUserSession(request);

    const interviewsRes = await api.interviews.list(token, 'limit=100').catch(() => ({ data: [], total: 0 })) as any;
    const interviews = interviewsRes.data || [];

    // Enrich with drive info
    const driveIds = [...new Set(interviews.map((i: any) => i.driveId).filter(Boolean))];
    const driveMap = new Map<string, any>();
    await Promise.all(driveIds.map(async (id: any) => {
        try {
            const res = await api.drives.getById(token, id) as any;
            driveMap.set(id, res.data || res);
        } catch { /* ignore */ }
    }));

    const enriched = interviews.map((iv: any) => {
        const drive = driveMap.get(iv.driveId) || {};
        return { ...iv, driveTitle: drive.title || 'Unknown Drive' };
    });

    const upcoming = enriched.filter((i: any) => i.status === 'scheduled' && new Date(i.scheduledAt) > new Date())
        .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    const past = enriched.filter((i: any) => i.status !== 'scheduled' || new Date(i.scheduledAt) <= new Date());

    return json({ upcoming, past, total: enriched.length });
}

export default function CompanyInterviewsPage() {
    const { upcoming, past, total } = useLoaderData<typeof loader>();

    const formatDate = (iso: string) => new Date(iso).toLocaleString('en-IN', {
        weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: Record<string, string> = {
            scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
            ongoing: 'bg-green-50 text-green-700 border-green-200',
            completed: 'bg-gray-100 text-gray-600 border-gray-200',
            cancelled: 'bg-red-50 text-red-600 border-red-200',
        };
        return (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] || colors.scheduled}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const InterviewRow = ({ iv }: { iv: any }) => (
        <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 text-sm truncate">{iv.driveTitle}</p>
                    <StatusBadge status={iv.status} />
                </div>
                <p className="text-xs text-gray-500 mb-1">
                    {formatDate(iv.scheduledAt)} · {iv.durationMinutes || 60} min · {iv.format?.replace('_', ' ')}
                </p>
                {iv.interviewerName && <p className="text-xs text-gray-400">Interviewer: {iv.interviewerName}</p>}
            </div>
            <div className="flex-shrink-0">
                {iv.status === 'scheduled' && iv.roomId && (
                    <a href={`/interview/${iv.roomId}`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition-colors">
                        <Video className="w-3.5 h-3.5" /> Join
                    </a>
                )}
                {iv.result && iv.result !== 'pending' && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${iv.result === 'pass' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                        {iv.result === 'pass' ? '✅ Pass' : '❌ Fail'}
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
                <p className="text-sm text-gray-500 mt-1">{total} total · {upcoming.length} upcoming</p>
            </div>

            {upcoming.length > 0 && (
                <Card className="p-0 overflow-hidden">
                    <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
                        <h2 className="font-semibold text-blue-800 text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Upcoming Interviews ({upcoming.length})
                        </h2>
                    </div>
                    <div className="px-5">
                        {upcoming.map((iv: any) => <InterviewRow key={iv.$id} iv={iv} />)}
                    </div>
                </Card>
            )}

            {past.length > 0 && (
                <Card className="p-0 overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-700 text-sm">Past Interviews</h2>
                    </div>
                    <div className="px-5">
                        {past.map((iv: any) => <InterviewRow key={iv.$id} iv={iv} />)}
                    </div>
                </Card>
            )}

            {total === 0 && (
                <Card>
                    <EmptyState
                        icon={<Calendar size={28} />}
                        title="No interviews yet"
                        description="Schedule interviews from the drive candidate management page."
                        action={<Link to="/drives" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Go to Drives →</Link>}
                    />
                </Card>
            )}
        </div>
    );
}
