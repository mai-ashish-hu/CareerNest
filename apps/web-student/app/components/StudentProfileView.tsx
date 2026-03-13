import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { StudentProfileResponse } from '@careernest/shared';
import { Badge, Card } from '@careernest/ui';
import {
    ArrowUpRight,
    BookOpenText,
    BriefcaseBusiness,
    Building2,
    FolderKanban,
    GraduationCap,
    MapPin,
    ShieldCheck,
    Sparkles,
    Star,
    Trophy,
} from 'lucide-react';
import { StudentPageHero } from '~/components/StudentPageHero';
import { formatJoinedDate, getProfileInitials } from '~/utils/student-profile';

function SectionCard({
    icon,
    title,
    count,
    children,
}: {
    icon: ReactNode;
    title: string;
    count?: number;
    children: ReactNode;
}) {
    return (
        <Card className="student-surface-card !p-6 transition duration-300 hover:-translate-y-0.5 hover:shadow-glass-lg">
            <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-sky-50 text-emerald-700 ring-1 ring-emerald-100">
                        {icon}
                    </div>
                    <h2 className="text-xl font-semibold text-surface-900">{title}</h2>
                </div>

                {typeof count === 'number' ? (
                    <Badge variant="bg-surface-100 text-surface-600">{count}</Badge>
                ) : null}
            </div>
            {children}
        </Card>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="student-muted-panel border-dashed px-4 py-6 text-sm leading-6 text-surface-500">
            {label}
        </div>
    );
}

function AvatarBlock({
    profilePicture,
    name,
}: {
    profilePicture: string;
    name: string;
}) {
    const [hasImageError, setHasImageError] = useState(false);

    useEffect(() => {
        setHasImageError(false);
    }, [profilePicture]);

    if (profilePicture && !hasImageError) {
        return (
            <img
                src={profilePicture}
                alt={name}
                crossOrigin="anonymous"
                onError={() => setHasImageError(true)}
                className="h-28 w-28 rounded-[2rem] border-4 border-white/20 object-cover shadow-2xl shadow-surface-950/20"
            />
        );
    }

    return (
        <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border-4 border-white/20 bg-white/10 text-3xl font-bold text-white shadow-2xl shadow-surface-950/20">
            {getProfileInitials(name)}
        </div>
    );
}

function HeroFact({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
                {label}
            </p>
            <p className="mt-2 text-xl font-bold text-white">{value}</p>
        </div>
    );
}

export function StudentProfileView({
    profile,
    action,
    sidebar,
}: {
    profile: StudentProfileResponse;
    action?: ReactNode;
    sidebar?: ReactNode;
}) {
    const showcaseCount =
        profile.projects.length + profile.experience.length + profile.achievements.length;
    const joinedDate = formatJoinedDate(profile.identity.createdAt);

    return (
        <div className="space-y-6">
            <StudentPageHero
                tone="ink"
                badge={profile.privacy.campusOnly ? 'Campus-only visibility' : 'Student profile'}
                title={profile.identity.name}
                description={
                    profile.summary.headline ||
                    'Add a clear headline so your campus can quickly understand what you are building toward.'
                }
                aside={
                    <div className="space-y-4">
                        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}

                        <div className="rounded-[1.6rem] border border-white/10 bg-white/10 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                                Campus snapshot
                            </p>
                            <div className="mt-4 space-y-3 text-sm text-white/75">
                                <div className="flex items-center justify-between gap-3">
                                    <span>Department</span>
                                    <span className="text-right font-semibold text-white">
                                        {profile.identity.departmentName || 'Not assigned'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span>College</span>
                                    <span className="text-right font-semibold text-white">
                                        {profile.identity.collegeName || 'Not assigned'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span>Joined</span>
                                    <span className="text-right font-semibold text-white">
                                        {joinedDate || 'Recently'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                }
            >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                    <AvatarBlock
                        profilePicture={profile.summary.profilePicture}
                        name={profile.identity.name}
                    />

                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            {profile.identity.departmentName ? (
                                <Badge variant="bg-white/10 text-white">
                                    <GraduationCap size={12} className="mr-1.5" />
                                    {profile.identity.departmentName}
                                </Badge>
                            ) : null}
                            {profile.summary.currentYear ? (
                                <Badge variant="bg-white/10 text-white">
                                    {profile.summary.currentYear}
                                </Badge>
                            ) : null}
                            {profile.summary.cgpa ? (
                                <Badge variant="bg-white/10 text-white">
                                    CGPA {profile.summary.cgpa}
                                </Badge>
                            ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                            {profile.identity.collegeName ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <Building2 size={14} />
                                    {profile.identity.collegeName}
                                </span>
                            ) : null}
                            {profile.summary.city ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin size={14} />
                                    {profile.summary.city}
                                </span>
                            ) : null}
                            {joinedDate ? <span>Joined {joinedDate}</span> : null}
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <HeroFact
                        label="Profile strength"
                        value={`${profile.summary.completionScore}%`}
                    />
                    <HeroFact
                        label="Skills shared"
                        value={`${profile.summary.skills.length}`}
                    />
                    <HeroFact
                        label="Showcase items"
                        value={`${showcaseCount}`}
                    />
                </div>
            </StudentPageHero>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">
                    <SectionCard icon={<Sparkles size={18} />} title="About">
                        {profile.summary.about ? (
                            <p className="text-sm leading-7 text-surface-600 sm:text-[0.97rem]">
                                {profile.summary.about}
                            </p>
                        ) : (
                            <EmptyState label="Add a short story about your goals, interests, and the work you want your campus to know you for." />
                        )}
                    </SectionCard>

                    <SectionCard
                        icon={<Star size={18} />}
                        title="Skills"
                        count={profile.summary.skills.length}
                    >
                        {profile.summary.skills.length > 0 ? (
                            <div className="flex flex-wrap gap-2.5">
                                {profile.summary.skills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-700"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <EmptyState label="No skills added yet." />
                        )}
                    </SectionCard>

                    <SectionCard
                        icon={<FolderKanban size={18} />}
                        title="Projects"
                        count={profile.projects.length}
                    >
                        {profile.projects.length > 0 ? (
                            <div className="space-y-4">
                                {profile.projects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="student-muted-panel px-4 py-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <h3 className="font-semibold text-surface-900">
                                                    {project.title}
                                                </h3>
                                                <p className="mt-1 text-sm leading-6 text-surface-600">
                                                    {project.shortDescription}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                {project.projectUrl ? (
                                                    <a
                                                        href={project.projectUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700"
                                                    >
                                                        Live
                                                        <ArrowUpRight size={12} />
                                                    </a>
                                                ) : null}
                                                {project.repositoryUrl ? (
                                                    <a
                                                        href={project.repositoryUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-3 py-1.5 text-xs font-semibold text-surface-700"
                                                    >
                                                        Repo
                                                        <ArrowUpRight size={12} />
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>

                                        {project.technologiesUsed.length > 0 ? (
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {project.technologiesUsed.map((technology) => (
                                                    <span
                                                        key={technology}
                                                        className="rounded-full border border-surface-200 bg-white px-3 py-1 text-xs font-medium text-surface-600"
                                                    >
                                                        {technology}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState label="No projects added yet." />
                        )}
                    </SectionCard>

                    <SectionCard
                        icon={<BriefcaseBusiness size={18} />}
                        title="Experience"
                        count={profile.experience.length}
                    >
                        {profile.experience.length > 0 ? (
                            <div className="space-y-4">
                                {profile.experience.map((item) => (
                                    <div
                                        key={item.id}
                                        className="student-muted-panel px-4 py-4"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h3 className="font-semibold text-surface-900">
                                                    {item.title}
                                                </h3>
                                                <p className="text-sm text-surface-500">
                                                    {item.company}
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-surface-600">
                                                {item.start} - {item.end}
                                            </span>
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-surface-600">
                                            {item.description}
                                        </p>
                                        {item.certificateUrl ? (
                                            <a
                                                href={item.certificateUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
                                            >
                                                View certificate
                                                <ArrowUpRight size={14} />
                                            </a>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState label="No experience shared yet." />
                        )}
                    </SectionCard>

                    <SectionCard
                        icon={<Trophy size={18} />}
                        title="Achievements"
                        count={profile.achievements.length}
                    >
                        {profile.achievements.length > 0 ? (
                            <div className="space-y-4">
                                {profile.achievements.map((achievement) => (
                                    <div
                                        key={achievement.id}
                                        className="student-muted-panel px-4 py-4"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="font-semibold text-surface-900">
                                                    {achievement.title}
                                                </h3>
                                                <p className="mt-1 text-sm leading-6 text-surface-600">
                                                    {achievement.description}
                                                </p>
                                            </div>
                                            {achievement.certificateUrl ? (
                                                <a
                                                    href={achievement.certificateUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
                                                >
                                                    Certificate
                                                    <ArrowUpRight size={14} />
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState label="No achievements added yet." />
                        )}
                    </SectionCard>

                    <SectionCard
                        icon={<BookOpenText size={18} />}
                        title="Education"
                        count={profile.education.length}
                    >
                        {profile.education.length > 0 ? (
                            <div className="space-y-4">
                                {profile.education.map((education) => (
                                    <div
                                        key={education.id}
                                        className="student-muted-panel px-4 py-4"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h3 className="font-semibold text-surface-900">
                                                    {education.level}
                                                </h3>
                                                <p className="text-sm text-surface-500">
                                                    {education.institution ||
                                                        education.board ||
                                                        education.department ||
                                                        'Academic record'}
                                                </p>
                                            </div>
                                            <div className="text-right text-sm font-medium text-surface-500">
                                                {education.year || ' '}
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-surface-500">
                                            {education.department ? (
                                                <span className="rounded-full bg-white px-3 py-1">
                                                    {education.department}
                                                </span>
                                            ) : null}
                                            {education.marks ? (
                                                <span className="rounded-full bg-white px-3 py-1">
                                                    Marks/CGPA {education.marks}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState label="No education milestones added yet." />
                        )}
                    </SectionCard>
                </div>

                <div className="space-y-6">
                    {sidebar ? (
                        sidebar
                    ) : (
                        <>
                            <Card className="student-surface-card !p-5">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">
                                            Profile completion
                                        </p>
                                        <p className="mt-2 text-3xl font-bold text-surface-900">
                                            {profile.summary.completionScore}%
                                        </p>
                                    </div>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                        <Star size={18} />
                                    </div>
                                </div>
                                <div className="mt-4 h-3 rounded-full bg-surface-100">
                                    <div
                                        className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                                        style={{ width: `${profile.summary.completionScore}%` }}
                                    />
                                </div>
                                <p className="mt-3 text-sm leading-6 text-surface-500">
                                    Add more sections to make your profile more discoverable inside campus.
                                </p>
                            </Card>

                            <Card className="student-surface-card !p-5">
                                <h2 className="text-lg font-semibold text-surface-900">
                                    Campus visibility
                                </h2>
                                <div className="mt-4 rounded-[1.5rem] bg-gradient-to-br from-emerald-50 to-sky-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-600">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-surface-800">
                                                Students in your college can discover this profile.
                                            </p>
                                            <p className="mt-1 text-sm leading-6 text-surface-500">
                                                Contact details stay hidden. Only the sections you maintain here are shown.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="student-surface-card !p-5">
                                <h2 className="text-lg font-semibold text-surface-900">
                                    Snapshot
                                </h2>
                                <div className="mt-4 space-y-3 text-sm">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-surface-500">College</span>
                                        <span className="text-right font-medium text-surface-800">
                                            {profile.identity.collegeName || 'Not assigned'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-surface-500">Department</span>
                                        <span className="text-right font-medium text-surface-800">
                                            {profile.identity.departmentName || 'Not assigned'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-surface-500">Current year</span>
                                        <span className="text-right font-medium text-surface-800">
                                            {profile.summary.currentYear || 'Not added'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-surface-500">Joined</span>
                                        <span className="text-right font-medium text-surface-800">
                                            {joinedDate || 'Recently'}
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
