import { Megaphone, Clock, Bell, Search } from 'lucide-react';
import { useState } from 'react';
import { Card, Badge, EmptyState } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';
import { StudentMetricCard, StudentMetricGrid, StudentPageHero } from '~/components/StudentPageHero';

export const meta: MetaFunction = () => [{ title: 'Announcements – Student – CareerNest' }];

interface Announcement {
    id: string;
    title: string;
    body: string;
    createdAt: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);

    const res = await api.announcements.list(token, 'limit=100').catch(() => ({ data: [] })) as { data: any[] };

    const announcements: Announcement[] = (res.data || []).map((a: any) => ({
        id: a.$id || '',
        title: a.title || '',
        body: a.body || '',
        createdAt: a.$createdAt || '',
    }));

    return json({ announcements });
}

export default function Announcements() {
    const { announcements } = useLoaderData<typeof loader>() as { announcements: Announcement[] };
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = announcements.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.body.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const todayCount = announcements.filter((announcement) => {
        if (!announcement.createdAt) return false;
        const created = new Date(announcement.createdAt);
        const today = new Date();
        return created.toDateString() === today.toDateString();
    }).length;

    return (
        <div className="space-y-6 animate-fade-in">
            <StudentPageHero
                tone="amber"
                badge="Placement cell feed"
                title="Announcements that are easier to scan"
                description="Search notices from your placement cell without digging through long lists. Useful updates stay visible, searchable, and easier to revisit."
                aside={
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                                <Megaphone size={20} />
                            </div>
                            <div>
                                <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                                    Posted
                                </p>
                                <p className="text-3xl font-bold text-white">{announcements.length}</p>
                            </div>
                        </div>
                        <p className="text-sm leading-6 text-white/75">
                            Catch fresh updates, shortlist the important ones, and search past announcements instantly.
                        </p>
                    </div>
                }
            />

            <StudentMetricGrid className="xl:grid-cols-3">
                <StudentMetricCard
                    label="Total Notices"
                    value={announcements.length}
                    hint="Everything your placement cell has posted."
                    icon={<Bell size={20} />}
                    tone="amber"
                />
                <StudentMetricCard
                    label="Visible Now"
                    value={filtered.length}
                    hint="Results after applying your search term."
                    icon={<Search size={20} />}
                    tone="ink"
                />
                <StudentMetricCard
                    label="Posted Today"
                    value={todayCount}
                    hint="Fresh updates created on the current date."
                    icon={<Clock size={20} />}
                    tone="sky"
                />
            </StudentMetricGrid>

            {/* Search */}
            <Card className="student-filter-bar !p-4">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    <input
                        type="text"
                        placeholder="Search announcements..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    />
                </div>
            </Card>

            {/* Announcements List */}
            {filtered.length > 0 ? (
                <div className="space-y-3">
                    <h3 className="text-xs sm:text-sm font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-2">
                        <Bell size={14} /> {filtered.length} Announcement{filtered.length !== 1 ? 's' : ''}
                    </h3>
                    {filtered.map((ann) => (
                        <Card key={ann.id} hover className="student-surface-card">
                            <div className="flex items-start gap-3 sm:gap-4">
                                <div className="p-2.5 sm:p-3 rounded-xl bg-primary-50 text-primary-500 flex-shrink-0">
                                    <Megaphone size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-surface-900 mb-1">{ann.title}</h3>
                                    <p className="text-sm text-surface-600 leading-relaxed">{ann.body}</p>
                                    {ann.createdAt && (
                                        <div className="flex items-center gap-3 mt-3 text-xs text-surface-400">
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {new Date(ann.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="student-surface-card">
                    <EmptyState
                        icon={<Megaphone size={28} />}
                        title={searchQuery ? 'No matching announcements' : 'No announcements yet'}
                        description={searchQuery ? 'Try a different search term.' : 'Your placement cell hasn\'t posted any announcements yet. Check back later.'}
                    />
                </Card>
            )}
        </div>
    );
}
