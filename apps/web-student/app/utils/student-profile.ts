import type {
    StudentAchievement,
    StudentEducation,
    StudentExperience,
    StudentProfileResponse,
    StudentProject,
    UpdateStudentProfileInput,
} from '@careernest/shared';

export type EditableStudentProfile = Required<
    Pick<
        UpdateStudentProfileInput,
        'headline' | 'about' | 'city' | 'currentYear' | 'cgpa' | 'profilePicture'
    >
> & {
    skills: string[];
    achievements: Array<Omit<StudentAchievement, 'id'>>;
    education: Array<Omit<StudentEducation, 'id'>>;
    experience: Array<Omit<StudentExperience, 'id'>>;
    projects: Array<Omit<StudentProject, 'id'>>;
};

export function emptyAchievement(): Omit<StudentAchievement, 'id'> {
    return {
        title: '',
        description: '',
        certificateUrl: '',
    };
}

export function emptyEducation(): Omit<StudentEducation, 'id'> {
    return {
        level: '',
        institution: '',
        board: '',
        department: '',
        marks: '',
        year: '',
    };
}

export function emptyExperience(): Omit<StudentExperience, 'id'> {
    return {
        title: '',
        company: '',
        description: '',
        start: '',
        end: '',
        certificateUrl: '',
    };
}

export function emptyProject(): Omit<StudentProject, 'id'> {
    return {
        title: '',
        shortDescription: '',
        technologiesUsed: [],
        projectUrl: '',
        repositoryUrl: '',
    };
}

export function buildEditableProfile(profile: StudentProfileResponse): EditableStudentProfile {
    return {
        headline: profile.summary.headline || '',
        about: profile.summary.about || '',
        city: profile.summary.city || '',
        currentYear: profile.summary.currentYear || '',
        cgpa: profile.summary.cgpa || '',
        profilePicture: profile.summary.profilePicture || '',
        skills: [...(profile.summary.skills || [])],
        achievements: profile.achievements.map(({ id: _id, ...achievement }) => achievement),
        education: profile.education.map(({ id: _id, ...education }) => education),
        experience: profile.experience.map(({ id: _id, ...experience }) => experience),
        projects: profile.projects.map(({ id: _id, ...project }) => project),
    };
}

export function parseJsonArray<T>(value: FormDataEntryValue | null): T[] {
    if (typeof value !== 'string' || !value.trim()) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed as T[] : [];
    } catch {
        return [];
    }
}

export function getProfileInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'CN';
}

export function formatJoinedDate(value: string): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}
