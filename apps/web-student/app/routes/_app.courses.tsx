import { useState } from 'react';
import {
    BookOpen, Link2, Video, Radio, ExternalLink, Calendar, Search,
    Play, PlayCircle, Monitor
} from 'lucide-react';
import { Card, EmptyState } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';
import { StudentPageHero } from '~/components/StudentPageHero';
import type { Course } from '@careernest/shared';

export const meta: MetaFunction = () => [{ title: 'Courses – Student – CareerNest' }];

const COURSE_TYPE_CONFIG = {
    video:      { Icon: Video,  label: 'Video',       color: 'bg-blue-50 text-blue-700 border-blue-200',     accent: 'from-blue-600 to-indigo-700' },
    link:       { Icon: Link2,  label: 'Resource',    color: 'bg-green-50 text-green-700 border-green-200',   accent: 'from-emerald-600 to-teal-700' },
    livestream: { Icon: Radio,  label: 'Live Stream', color: 'bg-red-50 text-red-700 border-red-200',         accent: 'from-red-600 to-rose-700' },
} as const;

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || '';

    const coursesRes = await api.courses.list(
        token,
        `limit=100${type ? `&courseType=${type}` : ''}`
    ).catch(() => ({ data: [], total: 0 })) as any;

    const courses: Course[] = (coursesRes.data || []).filter((c: Course) => c.isPublished !== false);
    return json({ courses, total: courses.length, currentType: type });
}

function CourseCard({ course }: { course: Course }) {
    const cfg = COURSE_TYPE_CONFIG[course.courseType] || COURSE_TYPE_CONFIG.link;
    const { Icon } = cfg;
    const [videoOpen, setVideoOpen] = useState(false);

    const isLiveNow = course.courseType === 'livestream' && course.streamStartTime &&
        Math.abs(new Date(course.streamStartTime).getTime() - Date.now()) < 2 * 60 * 60 * 1000;

    const handleAction = () => {
        if (course.courseType === 'link' && course.contentLink) {
            window.open(course.contentLink, '_blank');
        } else if (course.courseType === 'livestream' && course.streamUrl) {
            window.open(course.streamUrl, '_blank');
        } else if (course.courseType === 'video') {
            setVideoOpen(true);
        }
    };

    return (
        <>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={handleAction}>
                {/* Thumbnail / Hero */}
                <div className={`relative h-40 bg-gradient-to-br ${cfg.accent} flex items-center justify-center overflow-hidden`}>
                    {course.thumbnailUrl ? (
                        <img src={course.thumbnailUrl} alt={course.name} className="w-full h-full object-cover opacity-80" />
                    ) : (
                        <div className="flex flex-col items-center gap-2 opacity-40">
                            <Icon className="w-12 h-12 text-white" />
                        </div>
                    )}
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {course.courseType === 'video' ? (
                            <PlayCircle className="w-14 h-14 text-white drop-shadow-xl" />
                        ) : course.courseType === 'livestream' ? (
                            <Monitor className="w-14 h-14 text-white drop-shadow-xl" />
                        ) : (
                            <ExternalLink className="w-10 h-10 text-white drop-shadow-xl" />
                        )}
                    </div>
                    {/* Type Badge */}
                    <div className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                        {course.courseType === 'livestream' && isLiveNow && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        )}
                        {isLiveNow ? 'LIVE NOW' : cfg.label}
                    </div>
                </div>

                {/* Info */}
                <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2 group-hover:text-blue-700 transition-colors">
                        {course.name}
                    </h3>
                    {course.instructor && (
                        <p className="text-xs text-gray-500 mb-2">by {course.instructor}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                        {course.department && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{course.department}</span>
                        )}
                        {course.courseType === 'livestream' && course.streamStartTime && (
                            <span className="flex items-center gap-1 text-xs text-orange-600">
                                <Calendar className="w-3 h-3" />
                                {new Date(course.streamStartTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors
                            ${course.courseType === 'video' ? 'text-blue-700 bg-blue-50 group-hover:bg-blue-100' :
                              course.courseType === 'livestream' ? (isLiveNow ? 'text-red-700 bg-red-100' : 'text-orange-700 bg-orange-50 group-hover:bg-orange-100') :
                              'text-green-700 bg-green-50 group-hover:bg-green-100'}`}>
                            {course.courseType === 'video' && <><Play className="w-3 h-3" /> Watch Video</>}
                            {course.courseType === 'link' && <><ExternalLink className="w-3 h-3" /> Open Resource</>}
                            {course.courseType === 'livestream' && (isLiveNow ? <><Monitor className="w-3 h-3" /> Join Live</> : <><Calendar className="w-3 h-3" /> Schedule</>)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Modal */}
            {videoOpen && course.courseType === 'video' && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setVideoOpen(false)}>
                    <div className="bg-black rounded-2xl overflow-hidden shadow-2xl w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
                            <h3 className="text-white font-medium text-sm truncate">{course.name}</h3>
                            <button onClick={() => setVideoOpen(false)} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
                        </div>
                        <div className="aspect-video bg-black">
                            {course.videoUrl ? (
                                <video
                                    src={course.videoUrl}
                                    controls
                                    autoPlay
                                    className="w-full h-full"
                                >
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                    <div className="text-center">
                                        <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Video not available yet</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function StudentCoursesPage() {
    const { courses, total, currentType } = useLoaderData<typeof loader>();
    const [search, setSearch] = useState('');

    const filtered = courses.filter(c =>
        !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.instructor || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.department || '').toLowerCase().includes(search.toLowerCase())
    );

    const counts = {
        '': courses.length,
        video: courses.filter(c => c.courseType === 'video').length,
        link: courses.filter(c => c.courseType === 'link').length,
        livestream: courses.filter(c => c.courseType === 'livestream').length,
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <StudentPageHero
                tone="sky"
                badge="Learning resources"
                title="Your Courses"
                description="Videos, study materials, and live sessions shared by your placement cell."
            />

            {/* Type Filter Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                {([
                    { key: '', label: `All (${counts['']})` },
                    { key: 'video', label: `📹 Videos (${counts.video})` },
                    { key: 'link', label: `🔗 Resources (${counts.link})` },
                    { key: 'livestream', label: `📡 Live (${counts.livestream})` },
                ] as { key: string; label: string }[]).map(tab => (
                    <a key={tab.key} href={tab.key ? `?type=${tab.key}` : '?'}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                            ${currentType === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                        {tab.label}
                    </a>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full max-w-sm pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white" />
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={<BookOpen size={28} />}
                        title="No courses available"
                        description="Your placement cell hasn't added any courses yet. Check back soon!"
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(course => (
                        <CourseCard key={course.$id} course={course} />
                    ))}
                </div>
            )}
        </div>
    );
}
