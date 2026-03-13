import type { StudentDirectoryItem } from '@careernest/shared';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, EmptyState } from '@careernest/ui';
import { ArrowRight, MapPin, Search, Sparkles, Users } from 'lucide-react';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { api } from '@careernest/lib';
import { requireUserSession } from '~/auth.server';
import { getProfileInitials } from '~/utils/student-profile';
import { StudentMetricCard, StudentMetricGrid, StudentPageHero } from '~/components/StudentPageHero';

export const meta: MetaFunction = () => [{ title: 'Student Network – Student – CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const page = url.searchParams.get('page') || '1';

    if (!q) {
        return json({
            students: [],
            total: 0,
            page: 1,
            limit: 12,
            query: '',
            hasSearch: false,
            error: '',
        });
    }

    const params = new URLSearchParams({
        q,
        page,
        limit: '12',
    });

    try {
        const response = await api.students.searchDirectory(token, params.toString()) as {
            data: StudentDirectoryItem[];
            total: number;
            limit: number;
            page: number;
        };
        return json({
            students: response.data || [],
            total: response.total || 0,
            page: Number(response.page || page),
            limit: Number(response.limit || 12),
            query: q,
            hasSearch: true,
            error: '',
        });
    } catch {
        return json({
            students: [],
            total: 0,
            page: 1,
            limit: 12,
            query: q,
            hasSearch: true,
            error: 'Search is unavailable right now. Please try again in a moment.',
        });
    }
}

function DirectoryAvatar({ student }: { student: StudentDirectoryItem }) {
    const [hasImageError, setHasImageError] = useState(false);

    useEffect(() => {
        setHasImageError(false);
    }, [student.profilePicture]);

    if (student.profilePicture && !hasImageError) {
        return (
            <img
                src={student.profilePicture}
                alt={student.name}
                crossOrigin="anonymous"
                onError={() => setHasImageError(true)}
                className="h-16 w-16 rounded-2xl object-cover"
            />
        );
    }

    return (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-900 text-lg font-semibold text-white">
            {getProfileInitials(student.name)}
        </div>
    );
}

export default function StudentNetwork() {
    const { students, total, page, limit, query, hasSearch, error } = useLoaderData<typeof loader>() as {
        students: StudentDirectoryItem[];
        total: number;
        page: number;
        limit: number;
        query: string;
        hasSearch: boolean;
        error: string;
    };
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <div className="space-y-8 animate-fade-in">
            <StudentPageHero
                tone="ink"
                badge="Campus-only network"
                title="Discover students inside your college community"
                description="Search by student name or ID, open public student profiles, and discover peers across your college community."
                aside={
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                                <Users size={20} />
                            </div>
                            <div>
                                <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                                    {hasSearch ? 'Matched' : 'Search ready'}
                                </p>
                                <p className="text-3xl font-bold text-white">
                                    {hasSearch ? total : 'Name or ID'}
                                </p>
                            </div>
                        </div>
                        <p className="text-sm leading-6 text-white/75">
                            {hasSearch
                                ? 'Email, phone number, and address are hidden. Students only see the public profile data each student chooses to maintain.'
                                : 'Search results stay hidden until you enter a student name or student ID.'}
                        </p>
                    </div>
                }
            />

            {hasSearch ? (
                <StudentMetricGrid className="xl:grid-cols-3">
                    <StudentMetricCard
                        label="Students Found"
                        value={total}
                        hint="Profiles currently discoverable in your campus network."
                        icon={<Users size={20} />}
                        tone="emerald"
                    />
                    <StudentMetricCard
                        label="Page"
                        value={`${page}/${totalPages}`}
                        hint="Navigate smoothly through the directory."
                        icon={<Search size={20} />}
                        tone="ink"
                    />
                    <StudentMetricCard
                        label="Shown Now"
                        value={students.length}
                        hint="Profiles loaded on this screen right now."
                        icon={<Sparkles size={20} />}
                        tone="sky"
                    />
                </StudentMetricGrid>
            ) : null}

            <Card className="student-filter-bar">
                <Form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                        <label htmlFor="network-search" className="form-label">Search by student name or ID</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
                            <input
                                id="network-search"
                                name="q"
                                defaultValue={query}
                                placeholder="Search by student name or ID..."
                                className="form-input pl-11"
                            />
                        </div>
                    </div>
                    <Button type="submit">
                        <Search size={16} />
                        Search
                    </Button>
                </Form>
            </Card>

            {!hasSearch ? (
                <Card className="student-surface-card">
                    <EmptyState
                        icon={<Search size={20} />}
                        title="Search for a student"
                        description="Results appear only after you search by student name or student ID."
                    />
                </Card>
            ) : error ? (
                <Card className="student-surface-card">
                    <EmptyState
                        icon={<Sparkles size={20} />}
                        title="Search unavailable"
                        description={error}
                    />
                </Card>
            ) : students.length > 0 ? (
                <>
                    <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {students.map((student) => (
                            <Card key={student.studentId} className="student-surface-card !p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <DirectoryAvatar student={student} />
                                        <div>
                                            <h2 className="text-lg font-semibold text-surface-900">{student.name}</h2>
                                            <p className="text-sm font-medium text-surface-600">{student.headline}</p>
                                            <p className="mt-1 text-sm text-surface-500">
                                                {student.departmentName}
                                                {student.currentYear ? ` · ${student.currentYear}` : ''}
                                            </p>
                                            {student.city ? (
                                                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-surface-400">
                                                    <MapPin size={14} />
                                                    {student.city}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                    <Badge variant="bg-surface-100 text-surface-600">
                                        {student.skills.length} skills
                                    </Badge>
                                </div>

                                <p className="mt-4 text-sm leading-6 text-surface-500">
                                    {student.about || 'No about section added yet.'}
                                </p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {student.skills.slice(0, 4).map((skill) => (
                                        <span
                                            key={skill}
                                            className="rounded-full bg-surface-100 px-3 py-1 text-xs font-medium text-surface-600"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                    {student.skills.length > 4 ? (
                                        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                                            +{student.skills.length - 4}
                                        </span>
                                    ) : null}
                                </div>

                                <div className="mt-5 flex items-center justify-between text-sm text-surface-400">
                                    <div className="flex items-center gap-4">
                                        <span>{student.achievementsCount} achievements</span>
                                        <span>{student.projectsCount} projects</span>
                                    </div>
                                    <Link
                                        to={`/network/${student.studentId}`}
                                        prefetch="intent"
                                        className="inline-flex items-center gap-1.5 font-semibold text-primary-600 hover:text-primary-700"
                                    >
                                        View profile
                                        <ArrowRight size={14} />
                                    </Link>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {totalPages > 1 ? (
                        <div className="student-surface-card flex items-center justify-between px-5 py-4">
                            <p className="text-sm text-surface-500">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                {page > 1 ? (
                                    <Link
                                        to={`?${new URLSearchParams({ q: query, page: String(page - 1) }).toString()}`}
                                        prefetch="intent"
                                        className="rounded-xl border border-surface-200 px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50"
                                    >
                                        Previous
                                    </Link>
                                ) : null}
                                {page < totalPages ? (
                                    <Link
                                        to={`?${new URLSearchParams({ q: query, page: String(page + 1) }).toString()}`}
                                        prefetch="intent"
                                        className="rounded-xl border border-surface-200 px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50"
                                    >
                                        Next
                                    </Link>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </>
            ) : (
                <Card className="student-surface-card">
                    <EmptyState
                        icon={<Sparkles size={20} />}
                        title="No students found"
                        description={query ? 'Try a different spelling or search term.' : 'Students will appear here once profiles are ready.'}
                    />
                </Card>
            )}
        </div>
    );
}
