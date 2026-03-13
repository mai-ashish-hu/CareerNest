import { useState, useRef } from 'react';
import {
    Plus, Link2, Video, Radio, Trash2, Eye, EyeOff,
    ExternalLink, Calendar, BookOpen, Search,
    Upload, Check, GraduationCap
} from 'lucide-react';
import { Button, Card, Modal, EmptyState } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';
import type { Course } from '@careernest/shared';

export const meta: MetaFunction = () => [{ title: 'Courses – College – CareerNest' }];

const COURSE_TYPE_CONFIG = {
    video:      { Icon: Video,  label: 'Video',      color: 'bg-blue-50 text-blue-700 border-blue-200'   },
    link:       { Icon: Link2,  label: 'Link',        color: 'bg-green-50 text-green-700 border-green-200' },
    livestream: { Icon: Radio,  label: 'Live Stream', color: 'bg-red-50 text-red-700 border-red-200'      },
} as const;

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) throw redirect('/login');

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || '';

    const coursesRes = await api.courses.list(
        token, `limit=200${type ? `&courseType=${type}` : ''}`
    ).catch(() => ({ data: [], total: 0 })) as any;

    let courses: Course[] = coursesRes.data || [];

    // TPO_ASSISTANT sees only courses assigned to their department
    if (user.role === 'tpo_assistant' && user.department) {
        courses = courses.filter((c: Course) => !c.department || c.department === user.department);
    }

    return json({ courses, total: courses.length, currentType: type, userDepartment: user.department ?? null, isTpoAssistant: user.role === 'tpo_assistant' });
}

export async function action({ request }: ActionFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }
    const form = await request.formData();
    const intent = form.get('intent') as string;

    if (intent === 'create') {
        const courseType = form.get('courseType') as string;
        const payload: Record<string, unknown> = {
            name: form.get('name') as string,
            department: (form.get('department') as string) || '',
            instructor: (form.get('instructor') as string) || '',
            courseType,
            isPublished: true,
        };
        if (courseType === 'link') payload.contentLink = form.get('contentLink') as string;
        if (courseType === 'livestream') {
            payload.streamUrl = form.get('streamUrl') as string;
            const streamStart = form.get('streamStartTime') as string;
            if (streamStart) payload.streamStartTime = new Date(streamStart).toISOString();
        }
        if (courseType === 'video') {
            payload.videoFileName = form.get('videoFileName') as string;
            payload.videoFileType = form.get('videoFileType') as string;
            payload.videoBase64 = form.get('videoBase64') as string;
        }
        const thumbnailUrl = form.get('thumbnailUrl') as string;
        if (thumbnailUrl) payload.thumbnailUrl = thumbnailUrl;
        try {
            await api.courses.create(token, payload);
            return json({ success: true });
        } catch (err: any) {
            return json({ error: err?.message || 'Failed to create course' }, { status: 500 });
        }
    }
    if (intent === 'toggle_publish') {
        const id = form.get('id') as string;
        const isPublished = form.get('isPublished') === 'true';
        try {
            await api.courses.update(token, id, { isPublished: !isPublished });
            return json({ success: true });
        } catch (err: any) {
            return json({ error: err?.message }, { status: 500 });
        }
    }
    if (intent === 'delete') {
        const id = form.get('id') as string;
        try {
            await api.courses.delete(token, id);
            return json({ success: true });
        } catch (err: any) {
            return json({ error: err?.message }, { status: 500 });
        }
    }
    return json({ error: 'Unknown intent' }, { status: 400 });
}

function CourseCard({ course, onDelete }: { course: Course; onDelete: (c: Course) => void }) {
    const fetcher = useFetcher();
    const cfg = COURSE_TYPE_CONFIG[course.courseType] || COURSE_TYPE_CONFIG.link;
    const { Icon } = cfg;
    return (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-all">
            <div className="relative h-32 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center overflow-hidden">
                {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.name} className="w-full h-full object-cover opacity-70" />
                ) : (
                    <Icon className="w-10 h-10 text-slate-400" />
                )}
                <div className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                    {cfg.label}
                </div>
                <div className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${course.isPublished ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {course.isPublished ? '✓ Published' : '● Draft'}
                </div>
            </div>
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 truncate">{course.name}</h3>
                {course.instructor && <p className="text-xs text-gray-500 mb-1">by {course.instructor}</p>}
                {course.department && (
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs mb-2">{course.department}</span>
                )}
                {course.courseType === 'livestream' && course.streamStartTime && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 mb-2">
                        <Calendar className="w-3 h-3" />
                        {new Date(course.streamStartTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                    <fetcher.Form method="post" className="inline">
                        <input type="hidden" name="intent" value="toggle_publish" />
                        <input type="hidden" name="id" value={course.$id} />
                        <input type="hidden" name="isPublished" value={String(course.isPublished)} />
                        <button type="submit" title={course.isPublished ? 'Unpublish' : 'Publish'}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                            {course.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </fetcher.Form>
                    {(course.courseType === 'link' && course.contentLink) && (
                        <a href={course.contentLink} target="_blank" rel="noreferrer"
                            className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Open link">
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                    {(course.courseType === 'livestream' && course.streamUrl) && (
                        <a href={course.streamUrl} target="_blank" rel="noreferrer"
                            className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Join stream">
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                    <button onClick={() => onDelete(course)}
                        className="ml-auto p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function CreateCourseModal({ onClose }: { onClose: () => void }) {
    const fetcher = useFetcher();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [courseType, setCourseType] = useState<'video' | 'link' | 'livestream'>('link');
    const [videoFile, setVideoFile] = useState<{ name: string; type: string; base64: string } | null>(null);
    const [videoError, setVideoError] = useState('');
    const [isConverting, setIsConverting] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 50 * 1024 * 1024) { setVideoError('File too large. Max 50MB.'); return; }
        setVideoError(''); setIsConverting(true);
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            setVideoFile({ name: file.name, type: file.type, base64 });
            setIsConverting(false);
        };
        reader.onerror = () => { setVideoError('Failed to read file'); setIsConverting(false); };
        reader.readAsDataURL(file);
    };

    const successData = fetcher.data as any;
    if (successData?.success) { setTimeout(onClose, 100); }

    return (
        <Modal isOpen={true} onClose={onClose} title="Add New Course" size="lg">
            <fetcher.Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="create" />
                {videoFile && (
                    <>
                        <input type="hidden" name="videoBase64" value={videoFile.base64} />
                        <input type="hidden" name="videoFileName" value={videoFile.name} />
                        <input type="hidden" name="videoFileType" value={videoFile.type} />
                    </>
                )}
                <input type="hidden" name="courseType" value={courseType} />

                {/* Type Selector */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Course Type *</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(Object.entries(COURSE_TYPE_CONFIG) as [keyof typeof COURSE_TYPE_CONFIG, any][]).map(([type, cfg]) => (
                            <button key={type} type="button" onClick={() => { setCourseType(type); setVideoFile(null); }}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium
                                    ${courseType === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                <cfg.Icon className="w-5 h-5" />
                                {cfg.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course Name *</label>
                    <input type="text" name="name" required placeholder="e.g., Introduction to Python" className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <input type="text" name="department" placeholder="e.g., CSE, ALL" className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
                        <input type="text" name="instructor" placeholder="Instructor name" className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                </div>

                {courseType === 'link' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Content URL *</label>
                        <input type="url" name="contentLink" required placeholder="https://youtube.com/watch?v=..." className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        <p className="mt-1 text-xs text-gray-400">YouTube, Google Drive, Notion, PDF, or any URL</p>
                    </div>
                )}

                {courseType === 'video' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload Video *</label>
                        <div onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors
                                ${videoFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
                            {isConverting ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-xs text-gray-500">Processing...</p>
                                </div>
                            ) : videoFile ? (
                                <div className="flex flex-col items-center gap-1">
                                    <Check className="w-7 h-7 text-green-500" />
                                    <p className="text-sm text-green-700 font-medium">{videoFile.name}</p>
                                    <button type="button" onClick={e => { e.stopPropagation(); setVideoFile(null); }} className="text-xs text-gray-400 hover:text-red-500 mt-1">Remove</button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="w-7 h-7 text-gray-400" />
                                    <p className="text-sm text-gray-600 font-medium">Click to upload video</p>
                                    <p className="text-xs text-gray-400">MP4, WebM • Max 50MB</p>
                                </div>
                            )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/ogg" className="hidden" onChange={handleFileSelect} />
                        {videoError && <p className="mt-1 text-xs text-red-600">{videoError}</p>}
                    </div>
                )}

                {courseType === 'livestream' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stream URL *</label>
                            <input type="url" name="streamUrl" required placeholder="https://youtube.com/live/... or zoom link" className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Start Time</label>
                            <input type="datetime-local" name="streamStartTime" min={new Date().toISOString().slice(0, 16)} className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                    </>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL (optional)</label>
                    <input type="url" name="thumbnailUrl" placeholder="https://example.com/thumbnail.jpg" className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                {(successData as any)?.error && (
                    <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{(successData as any).error}</p>
                )}

                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={fetcher.state !== 'idle' || (courseType === 'video' && !videoFile)}
                        className="flex-1 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                        {fetcher.state !== 'idle' ? 'Creating...' : 'Create Course'}
                    </button>
                </div>
            </fetcher.Form>
        </Modal>
    );
}

export default function CoursesPage() {
    const { courses, total, currentType } = useLoaderData<typeof loader>();
    const fetcher = useFetcher();
    const [showCreate, setShowCreate] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
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
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-6 py-5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{total} total · Videos, links, and live streams for students</p>
                    </div>
                    <button onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                        <Plus className="w-4 h-4" /> Add Course
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Type Tabs */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
                    {([
                        { key: '', label: `All (${counts['']})` },
                        { key: 'video', label: `📹 Videos (${counts.video})` },
                        { key: 'link', label: `🔗 Links (${counts.link})` },
                        { key: 'livestream', label: `📡 Streams (${counts.livestream})` },
                    ] as { key: string; label: string }[]).map(tab => (
                        <a key={tab.key} href={tab.key ? `?type=${tab.key}` : '?'}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                                ${currentType === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                            {tab.label}
                        </a>
                    ))}
                </div>

                {/* Search */}
                <div className="relative mb-5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search by name, instructor, department..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full max-w-md pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white" />
                </div>

                {filtered.length === 0 ? (
                    <EmptyState
                        icon={<BookOpen className="w-8 h-8" />}
                        title="No courses yet"
                        description="Add video tutorials, resource links, or schedule live streams for your students"
                        action={<button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Add First Course</button>}
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map(course => (
                            <CourseCard key={course.$id} course={course} onDelete={setDeleteTarget} />
                        ))}
                    </div>
                )}
            </div>

            {showCreate && <CreateCourseModal onClose={() => setShowCreate(false)} />}

            {deleteTarget && (
                <Modal isOpen={true} onClose={() => setDeleteTarget(null)} title="Delete Course">
                    <p className="text-gray-600 text-sm mb-4">
                        Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?
                        {deleteTarget.courseType === 'video' && ' The uploaded video file will also be deleted.'}
                        {' '}This cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button onClick={() => {
                            const f = new FormData();
                            f.set('intent', 'delete');
                            f.set('id', deleteTarget.$id);
                            fetcher.submit(f, { method: 'post' });
                            setDeleteTarget(null);
                        }} className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700">Delete</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
