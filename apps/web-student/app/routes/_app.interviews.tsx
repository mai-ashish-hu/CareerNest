import { Calendar, Video, Phone, MapPin, Clock, ExternalLink, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Card, EmptyState } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';
import { StudentPageHero } from '~/components/StudentPageHero';
import type { Interview } from '@careernest/shared';

export const meta: MetaFunction = () => [{ title: 'Interviews – Student – CareerNest' }];

const FORMAT_CONFIG = {
    video_call: { Icon: Video,  label: 'Video Call',  color: 'text-blue-600 bg-blue-50 border-blue-200' },
    in_person:  { Icon: MapPin, label: 'In Person',   color: 'text-green-600 bg-green-50 border-green-200' },
    phone:      { Icon: Phone,  label: 'Phone',        color: 'text-purple-600 bg-purple-50 border-purple-200' },
} as const;

const STATUS_CONFIG = {
    scheduled:  { label: 'Scheduled',  color: 'text-blue-700 bg-blue-50 border-blue-200',   icon: AlertCircle },
    ongoing:    { label: 'In Progress',color: 'text-green-700 bg-green-100 border-green-200', icon: AlertCircle },
    completed:  { label: 'Completed',  color: 'text-gray-600 bg-gray-100 border-gray-200',   icon: CheckCircle2 },
    cancelled:  { label: 'Cancelled',  color: 'text-red-600 bg-red-50 border-red-200',        icon: XCircle },
} as const;

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);

    const interviewsRes = await api.interviews.list(token, 'limit=50').catch(() => ({ data: [], total: 0 })) as any;
    const interviews: Interview[] = (interviewsRes.data || []);

    // Enrich with drive details
    const driveIds = [...new Set(interviews.map(i => i.driveId).filter(Boolean))];
    const driveMap = new Map<string, any>();
    await Promise.all(driveIds.map(async id => {
        try {
            const res = await api.drives.getById(token, id) as any;
            const drive = res.data || res;
            driveMap.set(id, drive);
        } catch { /* ignore */ }
    }));

    const enriched = interviews.map(iv => {
        const drive = driveMap.get(iv.driveId) || {};
        const companyRef = drive.companies;
        const companyName = Array.isArray(companyRef)
            ? (companyRef[0]?.name || 'Unknown Company')
            : (companyRef?.name || 'Unknown Company');
        return {
            ...iv,
            driveTitle: drive.title || 'Unnamed Drive',
            companyName,
        };
    });

    const upcoming = enriched.filter(i => i.status === 'scheduled' && new Date(i.scheduledAt) > new Date());
    const past = enriched.filter(i => i.status !== 'scheduled' || new Date(i.scheduledAt) <= new Date());

    return json({ upcoming, past, total: enriched.length });
}

function InterviewCard({ interview }: { interview: Interview & { driveTitle: string; companyName: string } }) {
    const formatCfg = FORMAT_CONFIG[interview.format] || FORMAT_CONFIG.video_call;
    const statusCfg = STATUS_CONFIG[interview.status] || STATUS_CONFIG.scheduled;
    const { Icon: FormatIcon } = formatCfg;
    const { icon: StatusIcon } = statusCfg;

    const scheduledDate = new Date(interview.scheduledAt);
    const isToday = scheduledDate.toDateString() === new Date().toDateString();
    const isTomorrow = scheduledDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

    const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : scheduledDate.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const timeLabel = scheduledDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={`bg-white rounded-2xl border-2 p-5 transition-all
            ${interview.status === 'scheduled' && isToday ? 'border-blue-300 shadow-blue-50 shadow-lg' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <h3 className="font-semibold text-gray-900">{(interview as any).driveTitle}</h3>
                    <p className="text-sm text-gray-500">{(interview as any).companyName}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusCfg.label}
                </span>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium">{dateLabel}</span>
                    <span className="text-gray-400">at</span>
                    <span className="font-medium">{timeLabel}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{interview.durationMinutes || 60} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                    <FormatIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{formatCfg.label}</span>
                </div>
                {interview.interviewerName && (
                    <div className="flex items-center gap-2 text-gray-600">
                        <span className="w-4 h-4 text-center text-xs">👤</span>
                        <span>Interviewer: {interview.interviewerName}</span>
                    </div>
                )}
            </div>

            {interview.notes && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-700 leading-relaxed">
                        <strong>Note:</strong> {interview.notes}
                    </p>
                </div>
            )}

            {interview.status === 'scheduled' && (
                <div className="mt-4 flex items-center gap-2">
                    {interview.format === 'video_call' && interview.roomId && (
                        <a
                            href={`/interview/${interview.roomId}`}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            <Video className="w-4 h-4" /> Join Interview
                        </a>
                    )}
                    {interview.meetingLink && interview.format !== 'video_call' && (
                        <a
                            href={interview.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" /> Join
                        </a>
                    )}
                    {interview.format === 'video_call' && interview.meetingLink && !interview.roomId && (
                        <a
                            href={interview.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            <Video className="w-4 h-4" /> Join Meeting
                        </a>
                    )}
                </div>
            )}

            {interview.status === 'completed' && interview.result && interview.result !== 'pending' && (
                <div className={`mt-3 px-3 py-2 rounded-xl text-sm font-medium ${interview.result === 'pass' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    Result: {interview.result === 'pass' ? '✅ Passed' : '❌ Did not pass'}
                </div>
            )}
        </div>
    );
}

export default function StudentInterviewsPage() {
    const { upcoming, past, total } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-6 animate-fade-in">
            <StudentPageHero
                tone="sky"
                badge="Interview schedule"
                title="My Interviews"
                description={`${upcoming.length > 0 ? `${upcoming.length} upcoming interview${upcoming.length > 1 ? 's' : ''}` : 'No upcoming interviews'} · Stay prepared and be on time.`}
            />

            {/* Upcoming */}
            {upcoming.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Upcoming</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {upcoming.map(iv => (
                            <InterviewCard key={iv.$id} interview={iv as any} />
                        ))}
                    </div>
                </div>
            )}

            {/* Past */}
            {past.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past & Completed</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {past.map(iv => (
                            <InterviewCard key={iv.$id} interview={iv as any} />
                        ))}
                    </div>
                </div>
            )}

            {total === 0 && (
                <Card>
                    <EmptyState
                        icon={<Video size={28} />}
                        title="No interviews scheduled"
                        description="When you get shortlisted and an interview is scheduled, it will appear here."
                        action={<Link to="/applications" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View Applications →</Link>}
                    />
                </Card>
            )}
        </div>
    );
}
