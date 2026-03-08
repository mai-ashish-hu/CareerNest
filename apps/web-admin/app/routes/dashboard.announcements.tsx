import { useState } from 'react';
import {
    Bell,
    Plus,
    Send,
    Megaphone,
    Globe,
    Clock,
    Trash2,
} from 'lucide-react';
import { Button, Card, Modal } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Form, useNavigation } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Announcements – Super Admin – CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);

    try {
        const [announcementsRes, tenantsRes] = await Promise.all([
            api.announcements.list(token, 'limit=50') as Promise<{
                data: Array<Record<string, unknown>>;
                total: number;
            }>,
            api.tenants.list(token, 'limit=100') as Promise<{
                data: Array<Record<string, unknown>>;
            }>,
        ]);

        return json({
            announcements: announcementsRes.data || [],
            total: announcementsRes.total || 0,
            tenants: tenantsRes.data || [],
        });
    } catch {
        return json({ announcements: [], total: 0, tenants: [] });
    }
}

export async function action({ request }: ActionFunctionArgs) {
    const { token } = await requireUserSession(request);
    const formData = await request.formData();
    const intent = formData.get('intent') as string;

    if (intent === 'create') {
        const data = {
            title: formData.get('title') as string,
            body: formData.get('body') as string,
        };
        try {
            await api.announcements.create(token, data);
            return json({ success: true });
        } catch (error: unknown) {
            const err = error as { message?: string };
            return json({ success: false, error: err.message }, { status: 400 });
        }
    }

    if (intent === 'delete') {
        const id = formData.get('announcementId') as string;
        try {
            await api.announcements.delete(token, id);
            return json({ success: true });
        } catch (error: unknown) {
            const err = error as { message?: string };
            return json({ success: false, error: err.message }, { status: 400 });
        }
    }

    return json({ success: false }, { status: 400 });
}

export default function AdminAnnouncements() {
    const { announcements, total, tenants } = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === 'submitting';
    const [showCreateModal, setShowCreateModal] = useState(false);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900">Platform Announcements</h1>
                    <p className="text-surface-500 mt-1">
                        Broadcast announcements to all colleges
                    </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Megaphone size={18} /> New Announcement
                </Button>
            </div>

            {/* Announcements List */}
            {announcements.length > 0 ? (
                <div className="space-y-4">
                    {announcements.map((ann: Record<string, unknown>) => (
                        <Card key={ann.$id as string}>
                            <div className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                            <Bell size={18} className="text-amber-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-surface-900">
                                                {ann.title as string}
                                            </h3>
                                            <p className="text-sm text-surface-500 mt-1 whitespace-pre-wrap">
                                                {ann.body as string}
                                            </p>
                                            <div className="flex items-center gap-4 mt-3 text-xs text-surface-400">
                                                <span className="flex items-center gap-1">
                                                    <Globe size={12} /> Platform-wide
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {ann.$createdAt
                                                        ? new Date(ann.$createdAt as string).toLocaleString()
                                                        : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Form method="post">
                                        <input type="hidden" name="intent" value="delete" />
                                        <input type="hidden" name="announcementId" value={ann.$id as string} />
                                        <button
                                            type="submit"
                                            className="p-2 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </Form>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <div className="text-center py-16">
                        <Megaphone size={48} className="mx-auto text-surface-300 mb-4" />
                        <h3 className="text-lg font-semibold text-surface-700 mb-2">
                            No announcements
                        </h3>
                        <p className="text-surface-400 text-sm mb-6">
                            Create your first platform-wide announcement
                        </p>
                        <Button onClick={() => setShowCreateModal(true)}>
                            <Plus size={18} /> New Announcement
                        </Button>
                    </div>
                </Card>
            )}

            {/* Create Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="New Platform Announcement"
                size="md"
            >
                <Form method="post" className="space-y-5">
                    <input type="hidden" name="intent" value="create" />

                    <div>
                        <label className="form-label">Title *</label>
                        <input
                            type="text"
                            name="title"
                            required
                            placeholder="Announcement title"
                            className="form-input"
                        />
                    </div>

                    <div>
                        <label className="form-label">Message *</label>
                        <textarea
                            name="body"
                            required
                            rows={5}
                            placeholder="Write your announcement..."
                            className="form-input resize-none"
                        />
                    </div>

                    <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 flex items-start gap-2">
                        <Globe size={16} className="flex-shrink-0 mt-0.5" />
                        <span>This announcement will be visible to all colleges on the platform.</span>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                        <Button variant="ghost" type="button" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            <Send size={16} /> Publish
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
