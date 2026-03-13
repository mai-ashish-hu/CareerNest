import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type {
    StudentAchievement,
    StudentEducation,
    StudentExperience,
    StudentProfileResponse,
    StudentProject,
} from '@careernest/shared';
import { Badge, Button, Card, Input, Textarea } from '@careernest/ui';
import {
    CheckCircle2,
    Lock,
    PencilLine,
    Plus,
    Save,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react';
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useActionData, useLoaderData, useNavigation, useNavigate } from '@remix-run/react';
import { api, ApiClientError } from '@careernest/lib';
import { StudentProfileView } from '~/components/StudentProfileView';
import { requireUserSession } from '~/auth.server';
import {
    buildEditableProfile,
    EditableStudentProfile,
    emptyAchievement,
    emptyEducation,
    emptyExperience,
    emptyProject,
    parseJsonArray,
} from '~/utils/student-profile';

export const meta: MetaFunction = () => [{ title: 'Profile – Student – CareerNest' }];

type ActionData = {
    error?: string;
};

type UploadProfileAssetResponse = {
    data: {
        fileId: string;
        bucketId: string;
        fileUrl: string;
    };
};

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const MAX_PROFILE_PHOTO_BYTES = 8 * 1024 * 1024;

const DEFAULT_PROFILE: EditableStudentProfile = {
    headline: '',
    about: '',
    city: '',
    currentYear: '',
    cgpa: '',
    profilePicture: '',
    skills: [],
    achievements: [],
    education: [],
    experience: [],
    projects: [],
};

async function fileToBase64(file: File): Promise<string> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const binaryParts: string[] = [];
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        binaryParts.push(
            String.fromCharCode(...bytes.subarray(index, index + chunkSize))
        );
    }
    return btoa(binaryParts.join(''));
}

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const url = new URL(request.url);

    try {
        const profileRes = await api.students.getMyProfile(token) as { data: StudentProfileResponse };
        return json({
            profile: profileRes.data,
            saved: url.searchParams.get('saved') === '1',
        });
    } catch {
        return json({
            profile: null,
            saved: false,
        });
    }
}

export async function action({ request }: ActionFunctionArgs) {
    const { token } = await requireUserSession(request);
    const formData = await request.formData();

    const payload = {
        headline: String(formData.get('headline') || ''),
        about: String(formData.get('about') || ''),
        city: String(formData.get('city') || ''),
        currentYear: String(formData.get('currentYear') || ''),
        cgpa: String(formData.get('cgpa') || ''),
        profilePicture: String(formData.get('profilePicture') || ''),
        skills: parseJsonArray<string>(formData.get('skillsJson')),
        achievements: parseJsonArray<Omit<StudentAchievement, 'id'>>(formData.get('achievementsJson')),
        education: parseJsonArray<Omit<StudentEducation, 'id'>>(formData.get('educationJson')),
        experience: parseJsonArray<Omit<StudentExperience, 'id'>>(formData.get('experienceJson')),
        projects: parseJsonArray<Omit<StudentProject, 'id'>>(formData.get('projectsJson')),
    };

    try {
        const profilePictureFile = formData.get('profilePictureFile');
        if (profilePictureFile instanceof File && profilePictureFile.size > 0) {
            const result = await api.students.uploadProfileAsset(token, {
                assetType: 'profile_photo',
                fileName: profilePictureFile.name,
                fileType: profilePictureFile.type || 'application/octet-stream',
                fileBase64: await fileToBase64(profilePictureFile),
            }) as UploadProfileAssetResponse;
            payload.profilePicture = result.data.fileUrl;
        }

        for (let index = 0; index < payload.achievements.length; index += 1) {
            const file = formData.get(`achievementCertificateFile-${index}`);
            if (file instanceof File && file.size > 0) {
                const result = await api.students.uploadProfileAsset(token, {
                    assetType: 'certificate',
                    fileName: file.name,
                    fileType: file.type || 'application/octet-stream',
                    fileBase64: await fileToBase64(file),
                }) as UploadProfileAssetResponse;
                payload.achievements[index].certificateUrl = result.data.fileUrl;
            }
        }

        for (let index = 0; index < payload.experience.length; index += 1) {
            const file = formData.get(`experienceCertificateFile-${index}`);
            if (file instanceof File && file.size > 0) {
                const result = await api.students.uploadProfileAsset(token, {
                    assetType: 'certificate',
                    fileName: file.name,
                    fileType: file.type || 'application/octet-stream',
                    fileBase64: await fileToBase64(file),
                }) as UploadProfileAssetResponse;
                payload.experience[index].certificateUrl = result.data.fileUrl;
            }
        }

        await api.students.updateMyProfile(token, payload);
        return redirect('/profile?saved=1');
    } catch (error) {
        const message = error instanceof ApiClientError ? error.message : 'Unable to save profile right now.';
        return json<ActionData>({ error: message }, { status: 400 });
    }
}

function buildPreviewProfile(
    profile: StudentProfileResponse,
    form: EditableStudentProfile
): StudentProfileResponse {
    return {
        ...profile,
        summary: {
            ...profile.summary,
            headline: form.headline,
            about: form.about,
            city: form.city,
            currentYear: form.currentYear,
            cgpa: form.cgpa,
            profilePicture: form.profilePicture,
            skills: form.skills,
        },
        achievements: form.achievements.map((achievement, index) => ({
            id: `preview-achievement-${index}`,
            ...achievement,
        })),
        education: form.education.map((education, index) => ({
            id: `preview-education-${index}`,
            ...education,
        })),
        experience: form.experience.map((experience, index) => ({
            id: `preview-experience-${index}`,
            ...experience,
        })),
        projects: form.projects.map((project, index) => ({
            id: `preview-project-${index}`,
            ...project,
        })),
    };
}

function countSharedBlocks(profile: StudentProfileResponse): number {
    return [
        profile.summary.about.trim(),
        profile.summary.skills.length > 0,
        profile.achievements.length > 0,
        profile.education.length > 0,
        profile.experience.length > 0,
        profile.projects.length > 0,
    ].filter(Boolean).length;
}

function StatusCard({
    label,
    value,
    description,
}: {
    label: string;
    value: string;
    description: string;
}) {
    return (
        <div className="student-surface-card px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">
                {label}
            </p>
            <p className="mt-3 text-2xl font-bold text-surface-900">{value}</p>
            <p className="mt-1 text-sm leading-6 text-surface-500">{description}</p>
        </div>
    );
}

function SectionShell({
    title,
    subtitle,
    children,
    action,
}: {
    title: string;
    subtitle: string;
    children: ReactNode;
    action?: ReactNode;
}) {
    return (
        <Card className="student-surface-card !overflow-hidden !p-0">
            <div className="border-b border-surface-100 bg-gradient-to-r from-emerald-50/80 via-white to-sky-50/60 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-surface-900">{title}</h2>
                        <p className="mt-1 text-sm text-surface-500">{subtitle}</p>
                    </div>
                    {action}
                </div>
            </div>
            <div className="p-5 bg-white">{children}</div>
        </Card>
    );
}

function LockedField({ label, value }: { label: string; value: string }) {
    return (
        <div className="student-muted-panel px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">{label}</p>
            <p className="mt-1 text-sm font-medium text-surface-700">{value || 'Not available'}</p>
        </div>
    );
}

function EditingSidebar({
    profile,
    sharedBlocks,
}: {
    profile: StudentProfileResponse;
    sharedBlocks: number;
}) {
    const checklist = [
        { label: 'Add an about section', done: Boolean(profile.summary.about.trim()) },
        { label: 'Add at least 3 skills', done: profile.summary.skills.length >= 3 },
        { label: 'Show projects', done: profile.projects.length > 0 },
        { label: 'Show achievements or experience', done: profile.achievements.length > 0 || profile.experience.length > 0 },
    ];

    return (
        <div className="space-y-6">
            <Card className="student-surface-card !p-5">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-surface-900">Editing mode</h2>
                        <p className="mt-1 text-sm leading-6 text-surface-500">
                            Edit your sections directly. Click Save changes above when you are done.
                        </p>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="student-muted-panel px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">
                            Skills
                        </p>
                        <p className="mt-2 text-xl font-bold text-surface-900">
                            {profile.summary.skills.length}
                        </p>
                    </div>
                    <div className="student-muted-panel px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">
                            Shared blocks
                        </p>
                        <p className="mt-2 text-xl font-bold text-surface-900">{sharedBlocks}/6</p>
                    </div>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-sky-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-500">
                        Completion checklist
                    </p>
                    <div className="mt-3 space-y-2.5">
                        {checklist.map((item) => (
                            <div key={item.label} className="flex items-center gap-2 text-sm text-surface-600">
                                <CheckCircle2
                                    size={16}
                                    className={item.done ? 'text-emerald-600' : 'text-surface-300'}
                                />
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            <Card className="student-surface-card !p-5">
                <h2 className="text-lg font-semibold text-surface-900">Locked identity</h2>
                <p className="mt-1 text-sm text-surface-500">
                    These fields come from your college records and cannot be edited here.
                </p>

                <div className="mt-4 space-y-3">
                    <LockedField label="Name" value={profile.identity.name} />
                    <LockedField label="Email" value={profile.identity.email} />
                    <LockedField label="Department" value={profile.identity.departmentName} />
                    <LockedField label="College" value={profile.identity.collegeName} />
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-2xl bg-surface-50 px-4 py-3 text-sm text-surface-500">
                    <Lock size={16} className="mt-0.5 shrink-0" />
                    <span>Contact details remain hidden from other students on campus.</span>
                </div>
            </Card>
        </div>
    );
}

export default function Profile() {
    const { profile, saved } = useLoaderData<typeof loader>() as {
        profile: StudentProfileResponse | null;
        saved: boolean;
    };
    const actionData = useActionData<typeof action>() as ActionData | undefined;
    const navigation = useNavigation();
    const navigate = useNavigate();
    const isSaving = navigation.state === 'submitting';

    const [form, setForm] = useState<EditableStudentProfile>(
        profile ? buildEditableProfile(profile) : DEFAULT_PROFILE
    );
    const [skillInput, setSkillInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [hasProfileImageError, setHasProfileImageError] = useState(false);
    const [profilePreview, setProfilePreview] = useState<string | null>(null);
    const [profileFileError, setProfileFileError] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (profilePreview) URL.revokeObjectURL(profilePreview);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setForm(profile ? buildEditableProfile(profile) : DEFAULT_PROFILE);
        if (!profile) {
            setIsEditing(false);
        }
    }, [profile]);

    useEffect(() => {
        setHasProfileImageError(false);
    }, [form.profilePicture]);

    // Auto-clear the ?saved=1 param after 3 seconds
    useEffect(() => {
        if (saved) {
            const timer = setTimeout(() => {
                navigate('/profile', { replace: true });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [saved, navigate]);

    useEffect(() => {
        if (actionData?.error) {
            setIsEditing(true);
        }
    }, [actionData?.error]);

    if (!profile) {
        return (
            <div className="space-y-6 animate-fade-in">
                <Card className="student-surface-card !p-6">
                    <h1 className="text-2xl font-bold text-surface-900">My Profile</h1>
                    <p className="mt-1 text-surface-500">
                        Your student record is not ready yet. Contact your placement cell.
                    </p>
                </Card>
            </div>
        );
    }

    const formId = 'student-profile-edit-form';
    const previewProfile = buildPreviewProfile(profile, form);
    const sharedBlocks = countSharedBlocks(previewProfile);

    const resetToSavedProfile = () => {
        setForm(buildEditableProfile(profile));
        setSkillInput('');
        if (profilePreview) URL.revokeObjectURL(profilePreview);
        setProfilePreview(null);
        setProfileFileError(null);
    };

    const handleProfileFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        if (profilePreview) {
            URL.revokeObjectURL(profilePreview);
            setProfilePreview(null);
        }
        setProfileFileError(null);
        if (!file) return;
        if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
            setProfileFileError('Only JPG, PNG, WebP, and GIF images are accepted.');
            event.target.value = '';
            return;
        }
        if (file.size > MAX_PROFILE_PHOTO_BYTES) {
            setProfileFileError('Image must be under 8 MB.');
            event.target.value = '';
            return;
        }
        setProfilePreview(URL.createObjectURL(file));
    };

    const setField = (field: keyof EditableStudentProfile, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const updateItem = (
        section: 'achievements' | 'education' | 'experience' | 'projects',
        index: number,
        field: string,
        value: string | string[]
    ) => {
        setForm((current) => {
            const nextSection = [...current[section]] as Array<Record<string, unknown>>;
            nextSection[index] = { ...nextSection[index], [field]: value };
            return { ...current, [section]: nextSection } as EditableStudentProfile;
        });
    };

    const removeItem = (
        section: 'achievements' | 'education' | 'experience' | 'projects',
        index: number
    ) => {
        setForm((current) => ({
            ...current,
            [section]: current[section].filter((_, itemIndex) => itemIndex !== index),
        }));
    };

    const addSkill = () => {
        const skill = skillInput.trim();
        if (!skill) return;
        if (form.skills.includes(skill)) {
            setSkillInput('');
            return;
        }
        setForm((current) => ({ ...current, skills: [...current.skills, skill] }));
        setSkillInput('');
    };

    const removeSkill = (skill: string) => {
        setForm((current) => ({
            ...current,
            skills: current.skills.filter((item) => item !== skill),
        }));
    };

    const startEditing = () => {
        setIsEditing(true);
    };

    const cancelEditing = () => {
        resetToSavedProfile();
        setIsEditing(false);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <Card className="student-surface-card !p-0">
                <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                            <Badge variant={isEditing ? 'bg-amber-50 text-amber-700' : 'bg-primary-50 text-primary-700'}>
                                {isEditing ? 'Edit mode' : 'Campus profile'}
                            </Badge>
                            <h1 className="mt-3 text-3xl font-bold text-surface-900">Manage your campus profile</h1>
                            <p className="mt-2 text-surface-500">
                                {isEditing
                                    ? 'Update your public student profile here. The preview below changes immediately so you can review before saving.'
                                    : 'Review how students inside your college see you. Switch to edit mode when you want to improve sections, then come back to the preview with one click.'}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {isEditing ? (
                                <>
                                    <Button type="button" variant="ghost" onClick={cancelEditing}>
                                        <X size={16} />
                                        Cancel
                                    </Button>
                                    <Button type="submit" form={formId} disabled={isSaving}>
                                        <Save size={16} />
                                        {isSaving ? 'Saving...' : 'Save changes'}
                                    </Button>
                                </>
                            ) : (
                                <Button type="button" onClick={startEditing}>
                                    <PencilLine size={16} />
                                    Edit profile
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <StatusCard
                            label="Completion"
                            value={`${profile.summary.completionScore}%`}
                            description="How complete your public campus profile currently looks."
                        />
                        <StatusCard
                            label="Shared blocks"
                            value={`${sharedBlocks}/6`}
                            description="About, skills, achievements, education, experience, and projects."
                        />
                        <StatusCard
                            label="Visibility"
                            value="Campus only"
                            description="Other students can discover you, but contact details stay hidden."
                        />
                    </div>
                </div>
            </Card>

            {saved ? (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <CheckCircle2 size={16} />
                    Profile updated successfully.
                </div>
            ) : null}

            {actionData?.error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {actionData.error}
                </div>
            ) : null}

            {isEditing ? (
                <form id={formId} method="post" encType="multipart/form-data" className="space-y-4 sm:space-y-6">
                    <input type="hidden" name="profilePicture" value={form.profilePicture} />
                    <input type="hidden" name="skillsJson" value={JSON.stringify(form.skills)} />
                    <input type="hidden" name="achievementsJson" value={JSON.stringify(form.achievements)} />
                    <input type="hidden" name="educationJson" value={JSON.stringify(form.education)} />
                    <input type="hidden" name="experienceJson" value={JSON.stringify(form.experience)} />
                    <input type="hidden" name="projectsJson" value={JSON.stringify(form.projects)} />

                    {/* Editable profile banner */}
                    <div className="student-surface-card !overflow-hidden">
                        <div className="h-32 sm:h-40 rounded-t-2xl sm:rounded-t-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_32%),linear-gradient(135deg,_rgba(236,253,245,1)_0%,_rgba(239,246,255,1)_100%)]" />
                        <div className="px-4 pb-6 pt-0 sm:px-6 lg:px-8">
                            <div className="-mt-14 flex flex-col gap-6">
                                <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                                    <div className="shrink-0">
                                        {(profilePreview || (form.profilePicture && !hasProfileImageError)) ? (
                                            <img
                                                src={profilePreview || form.profilePicture}
                                                alt={profile.identity.name}
                                                onError={() => { if (!profilePreview) setHasProfileImageError(true); }}
                                                className="h-28 w-28 rounded-[2rem] border-4 border-white object-cover shadow-xl"
                                            />
                                        ) : (
                                            <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border-4 border-white bg-surface-900 text-3xl font-bold text-white shadow-xl">
                                                {profile.identity.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 pb-1">
                                        <h1 className="text-3xl font-bold text-surface-900">{profile.identity.name}</h1>
                                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                            <Input
                                                name="headline"
                                                label="Headline"
                                                value={form.headline}
                                                onChange={(event) => setField('headline', event.target.value)}
                                                placeholder="Frontend developer focused on React..."
                                                maxLength={120}
                                            />
                                            <Input
                                                name="city"
                                                label="City"
                                                value={form.city}
                                                onChange={(event) => setField('city', event.target.value)}
                                                placeholder="Chhatrapati Sambhaji Nagar"
                                                maxLength={120}
                                            />
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-500">Current Year</label>
                                                <select
                                                    name="currentYear"
                                                    value={form.currentYear}
                                                    onChange={(event) => setField('currentYear', event.target.value)}
                                                    className="form-input"
                                                >
                                                    <option value="">Select year</option>
                                                    <option value="1st">1st Year</option>
                                                    <option value="2nd">2nd Year</option>
                                                    <option value="3rd">3rd Year</option>
                                                    <option value="4th">4th Year</option>
                                                    <option value="5th">5th Year</option>
                                                    <option value="Graduate">Graduate</option>
                                                </select>
                                            </div>
                                            <Input
                                                name="cgpa"
                                                label="CGPA"
                                                value={form.cgpa}
                                                onChange={(event) => setField('cgpa', event.target.value)}
                                                placeholder="7.4"
                                                maxLength={20}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/40 p-4">
                                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                                        <Input
                                            name="profilePictureFile"
                                            label="Profile Picture"
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                            onChange={handleProfileFileChange}
                                            error={profileFileError ?? undefined}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => {
                                                setField('profilePicture', '');
                                                if (profilePreview) URL.revokeObjectURL(profilePreview);
                                                setProfilePreview(null);
                                                setProfileFileError(null);
                                            }}
                                            disabled={!form.profilePicture && !profilePreview}
                                        >
                                            Remove current photo
                                        </Button>
                                    </div>
                                    <p className="mt-2 text-xs text-surface-500">
                                        Accepted: JPG, PNG, WebP, GIF &middot; Max 8 MB &middot; Resized to 320&times;320 px
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="space-y-4 sm:space-y-6">
                        <SectionShell
                            title="About"
                            subtitle="Tell your campus what you are building, learning, and aiming for."
                        >
                            <Textarea
                                name="about"
                                label="About"
                                value={form.about}
                                onChange={(event) => setField('about', event.target.value)}
                                placeholder="Tell your campus what you are building, learning, and aiming for."
                                maxLength={1200}
                            />
                        </SectionShell>

                        <SectionShell
                            title="Skills"
                            subtitle="Add the tools and strengths you want other students to find you for."
                            action={
                                <div className="flex w-full gap-2 sm:w-auto">
                                    <input
                                        value={skillInput}
                                        onChange={(event) => setSkillInput(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                event.preventDefault();
                                                addSkill();
                                            }
                                        }}
                                        placeholder="Add a skill"
                                        className="form-input min-w-[180px]"
                                    />
                                    <Button type="button" variant="secondary" size="sm" onClick={addSkill}>
                                        <Plus size={16} />
                                        Add
                                    </Button>
                                </div>
                            }
                        >
                            {form.skills.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {form.skills.map((skill) => (
                                        <button
                                            key={skill}
                                            type="button"
                                            onClick={() => removeSkill(skill)}
                                            className="rounded-full bg-surface-100 px-3 py-1.5 text-sm font-medium text-surface-700 transition hover:bg-surface-200"
                                        >
                                            {skill} ×
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-surface-400">No skills added yet.</p>
                            )}
                        </SectionShell>

                        <SectionShell
                            title="Achievements"
                            subtitle="Highlight certifications, awards, wins, and recognitions."
                            action={
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setForm((current) => ({
                                        ...current,
                                        achievements: [...current.achievements, emptyAchievement()],
                                    }))}
                                >
                                    <Plus size={16} />
                                    Add achievement
                                </Button>
                            }
                        >
                            <div className="space-y-4">
                                {form.achievements.map((achievement, index) => (
                                    <div key={`achievement-${index}`} className="rounded-2xl border border-surface-200 bg-surface-50/40 p-4">
                                        <div className="mb-4 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeItem('achievements', index)}
                                                className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700"
                                            >
                                                <Trash2 size={15} />
                                                Remove
                                            </button>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Input
                                                label="Title"
                                                value={achievement.title}
                                                onChange={(event) => updateItem('achievements', index, 'title', event.target.value)}
                                            />
                                            <Input
                                                label="Certificate Link (optional)"
                                                value={achievement.certificateUrl}
                                                onChange={(event) => updateItem('achievements', index, 'certificateUrl', event.target.value)}
                                                placeholder="https://..."
                                            />
                                            <Input
                                                name={`achievementCertificateFile-${index}`}
                                                label="Certificate File Upload (optional)"
                                                type="file"
                                                accept="application/pdf,image/*"
                                            />
                                        </div>
                                        <p className="mt-3 text-xs text-surface-500">
                                            You can provide a link, upload a file, or both. Uploaded files are stored
                                            in your certificates bucket.
                                        </p>
                                        {achievement.certificateUrl ? (
                                            <a
                                                href={achievement.certificateUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-2 inline-flex text-sm font-medium text-primary-700 hover:text-primary-800"
                                            >
                                                View current certificate
                                            </a>
                                        ) : null}
                                        <div className="mt-4">
                                            <Textarea
                                                label="Description"
                                                value={achievement.description}
                                                onChange={(event) => updateItem('achievements', index, 'description', event.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {form.achievements.length === 0 ? (
                                    <p className="text-sm text-surface-400">No achievements added yet.</p>
                                ) : null}
                            </div>
                        </SectionShell>

                        <SectionShell
                            title="Education"
                            subtitle="Keep your academic milestones structured instead of storing everything in one large document."
                            action={
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setForm((current) => ({
                                        ...current,
                                        education: [...current.education, emptyEducation()],
                                    }))}
                                >
                                    <Plus size={16} />
                                    Add education
                                </Button>
                            }
                        >
                            <div className="space-y-4">
                                {form.education.map((education, index) => (
                                    <div key={`education-${index}`} className="rounded-2xl border border-surface-200 bg-surface-50/40 p-4">
                                        <div className="mb-4 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeItem('education', index)}
                                                className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700"
                                            >
                                                <Trash2 size={15} />
                                                Remove
                                            </button>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-500">Level</label>
                                                <select
                                                    value={education.level}
                                                    onChange={(event) => updateItem('education', index, 'level', event.target.value)}
                                                    className="form-input"
                                                >
                                                    <option value="">Select level</option>
                                                    <option value="class_10">Class 10</option>
                                                    <option value="class_12">Class 12</option>
                                                    <option value="diploma">Diploma</option>
                                                    <option value="btech">B.Tech</option>
                                                    <option value="mtech">M.Tech</option>
                                                    <option value="bca">BCA</option>
                                                    <option value="mca">MCA</option>
                                                    <option value="bsc">B.Sc</option>
                                                    <option value="msc">M.Sc</option>
                                                    <option value="mba">MBA</option>
                                                    <option value="phd">PhD</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                            <Input label="Institution" value={education.institution || ''} onChange={(event) => updateItem('education', index, 'institution', event.target.value)} />
                                            <Input label="Board" value={education.board || ''} onChange={(event) => updateItem('education', index, 'board', event.target.value)} />
                                            <Input label="Department" value={education.department || ''} onChange={(event) => updateItem('education', index, 'department', event.target.value)} />
                                            <Input label="Marks/CGPA" value={education.marks || ''} onChange={(event) => updateItem('education', index, 'marks', event.target.value)} />
                                            <Input label="Passing Year" value={education.year || ''} onChange={(event) => updateItem('education', index, 'year', event.target.value)} />
                                        </div>
                                    </div>
                                ))}
                                {form.education.length === 0 ? (
                                    <p className="text-sm text-surface-400">No education entries added yet.</p>
                                ) : null}
                            </div>
                        </SectionShell>

                        <SectionShell
                            title="Experience"
                            subtitle="Show internships, leadership roles, freelancing, and campus responsibilities."
                            action={
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setForm((current) => ({
                                        ...current,
                                        experience: [...current.experience, emptyExperience()],
                                    }))}
                                >
                                    <Plus size={16} />
                                    Add experience
                                </Button>
                            }
                        >
                            <div className="space-y-4">
                                {form.experience.map((experience, index) => (
                                    <div key={`experience-${index}`} className="rounded-2xl border border-surface-200 bg-surface-50/40 p-4">
                                        <div className="mb-4 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeItem('experience', index)}
                                                className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700"
                                            >
                                                <Trash2 size={15} />
                                                Remove
                                            </button>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Input label="Role" value={experience.title} onChange={(event) => updateItem('experience', index, 'title', event.target.value)} />
                                            <Input label="Company / Organization" value={experience.company} onChange={(event) => updateItem('experience', index, 'company', event.target.value)} />
                                            <Input label="Start" value={experience.start} onChange={(event) => updateItem('experience', index, 'start', event.target.value)} />
                                            <Input label="End" value={experience.end} onChange={(event) => updateItem('experience', index, 'end', event.target.value)} />
                                            <Input
                                                label="Certificate Link (optional)"
                                                value={experience.certificateUrl}
                                                onChange={(event) => updateItem('experience', index, 'certificateUrl', event.target.value)}
                                                placeholder="https://..."
                                            />
                                            <Input
                                                name={`experienceCertificateFile-${index}`}
                                                label="Certificate File Upload (optional)"
                                                type="file"
                                                accept="application/pdf,image/*"
                                            />
                                        </div>
                                        <p className="mt-3 text-xs text-surface-500">
                                            Certificate supports both direct link and file upload.
                                        </p>
                                        {experience.certificateUrl ? (
                                            <a
                                                href={experience.certificateUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-2 inline-flex text-sm font-medium text-primary-700 hover:text-primary-800"
                                            >
                                                View current certificate
                                            </a>
                                        ) : null}
                                        <div className="mt-4">
                                            <Textarea label="Description" value={experience.description} onChange={(event) => updateItem('experience', index, 'description', event.target.value)} />
                                        </div>
                                    </div>
                                ))}
                                {form.experience.length === 0 ? (
                                    <p className="text-sm text-surface-400">No experience entries added yet.</p>
                                ) : null}
                            </div>
                        </SectionShell>

                        <SectionShell
                            title="Projects"
                            subtitle="Add production work, experiments, and portfolio projects with technology context."
                            action={
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setForm((current) => ({
                                        ...current,
                                        projects: [...current.projects, emptyProject()],
                                    }))}
                                >
                                    <Plus size={16} />
                                    Add project
                                </Button>
                            }
                        >
                            <div className="space-y-4">
                                {form.projects.map((project, index) => (
                                    <div key={`project-${index}`} className="rounded-2xl border border-surface-200 bg-surface-50/40 p-4">
                                        <div className="mb-4 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeItem('projects', index)}
                                                className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700"
                                            >
                                                <Trash2 size={15} />
                                                Remove
                                            </button>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Input label="Title" value={project.title} onChange={(event) => updateItem('projects', index, 'title', event.target.value)} />
                                            <Input label="Project URL" value={project.projectUrl || ''} onChange={(event) => updateItem('projects', index, 'projectUrl', event.target.value)} />
                                            <Input label="Repository URL" value={project.repositoryUrl || ''} onChange={(event) => updateItem('projects', index, 'repositoryUrl', event.target.value)} />
                                            <Input
                                                label="Technologies"
                                                value={project.technologiesUsed.join(', ')}
                                                onChange={(event) => updateItem(
                                                    'projects',
                                                    index,
                                                    'technologiesUsed',
                                                    event.target.value.split(',').map((item) => item.trim()).filter(Boolean)
                                                )}
                                                placeholder="React, Next.js, Node.js"
                                            />
                                        </div>
                                        <div className="mt-4">
                                            <Textarea label="Short Description" value={project.shortDescription} onChange={(event) => updateItem('projects', index, 'shortDescription', event.target.value)} />
                                        </div>
                                    </div>
                                ))}
                                {form.projects.length === 0 ? (
                                    <p className="text-sm text-surface-400">No projects added yet.</p>
                                ) : null}
                            </div>
                        </SectionShell>
                        </div>
                        <div className="xl:sticky xl:top-24 h-fit">
                            <EditingSidebar profile={previewProfile} sharedBlocks={sharedBlocks} />
                        </div>
                    </div>
                </form>
            ) : (
                <StudentProfileView
                    profile={profile}
                    action={
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="bg-primary-50 text-primary-700">Campus only</Badge>
                        </div>
                    }
                />
            )}
        </div>
    );
}
