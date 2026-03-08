import { useState } from 'react';
import { Plus, Megaphone, Clock, Pin, Eye, Trash2, Send } from 'lucide-react';
import { Button, Card, Badge, Modal, Input, Textarea, EmptyState } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Announcements – College – CareerNest' }];

interface Announcement {
    id: string;
    title: string;
    body: string;
    createdAt: string;
    isPinned: boolean;
    views: number;
    author: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) throw redirect('/login');
    const tenantId = user.tenantId;

    const announcementsRes = await api.announcements.list(token, `tenantId=${tenantId}&limit=500`).catch(() => ({ data: [], total: 0 })) as { data: any[]; total: number };

    const announcements: Announcement[] = (announcementsRes.data || []).map((a: any) => ({
        id: a.$id || a.id || '',
        title: a.title || '',
        body: a.body || a.content || a.message || '',
        createdAt: a.createdAt || a.$createdAt || '',
        isPinned: !!a.isPinned,
        views: a.views ?? 0,
        author: a.author || a.createdBy || '',
    }));

    return json({ announcements });
}

export default function Announcements() {
    const { announcements } = useLoaderData<typeof loader>() as { announcements: Announcement[] };
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900">Announcements</h1>
                    <p className="text-surface-500 mt-1">Post updates and notifications for students</p>
                </div>
                <Button onClick={() => setShowModal(true)}>
                    <Plus size={18} /> New Announcement
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Megaphone size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{announcements.length}</p>
                            <p className="text-xs text-surface-500">Total Announcements</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><Pin size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{announcements.filter(a => a.isPinned).length}</p>
                            <p className="text-xs text-surface-500">Pinned</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Eye size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{announcements.reduce((a, ann) => a + ann.views, 0)}</p>
                            <p className="text-xs text-surface-500">Total Views</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Announcement List */}
            {announcements.length > 0 ? (
            <div className="space-y-4">
                {announcements.map((announcement) => (
                    <Card key={announcement.id} hover>
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl flex-shrink-0 ${announcement.isPinned ? 'bg-amber-50 text-amber-600' : 'bg-surface-50 text-surface-400'}`}>
                                {announcement.isPinned ? <Pin size={20} /> : <Megaphone size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-surface-900">{announcement.title}</h3>
                                            {announcement.isPinned && (
                                                <Badge variant="bg-amber-100 text-amber-700">Pinned</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-surface-600 leading-relaxed line-clamp-2">{announcement.body}</p>
                                    </div>
                                    <button className="p-1.5 rounded-lg text-surface-300 hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0" title="Delete">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-xs text-surface-400">
                                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(announcement.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    <span>by {announcement.author}</span>
                                    <span className="flex items-center gap-1"><Eye size={12} /> {announcement.views} views</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            ) : (
                <Card>
                    <EmptyState
                        icon={<Megaphone size={28} />}
                        title="No announcements yet"
                        description="Create your first announcement to notify students."
                        action={<Button onClick={() => setShowModal(true)}><Plus size={16} /> New Announcement</Button>}
                    />
                </Card>
            )}

            {/* New Announcement Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Announcement" size="lg">
                <form className="space-y-5">
                    <Input name="title" label="Title" placeholder="e.g., Important Placement Update" required />
                    <Textarea name="body" label="Message" placeholder="Write your announcement here..." rows={5} required />
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-surface-700 cursor-pointer">
                            <input type="checkbox" className="rounded border-surface-300 text-primary-600 focus:ring-primary-500" />
                            Pin this announcement
                        </label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                        <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button type="submit"><Send size={16} /> Publish</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
