export interface StudentIdentitySnapshot {
    studentId: string;
    name: string;
    email: string;
    phoneNumber?: string;
    departmentId?: string;
    departmentName: string;
    collegeId?: string;
    collegeName: string;
    createdAt: string;
}

export interface StudentProfileSummary {
    headline: string;
    about: string;
    city: string;
    currentYear: string;
    cgpa: string;
    profilePicture: string;
    completionScore: number;
    skills: string[];
}

export interface StudentAchievement {
    id: string;
    title: string;
    description: string;
    certificateUrl: string;
}

export interface StudentEducation {
    id: string;
    level: string;
    institution?: string;
    board?: string;
    department?: string;
    marks?: string;
    year?: string;
}

export interface StudentExperience {
    id: string;
    title: string;
    company: string;
    description: string;
    start: string;
    end: string;
    certificateUrl: string;
}

export interface StudentProject {
    id: string;
    title: string;
    shortDescription: string;
    technologiesUsed: string[];
    projectUrl?: string;
    repositoryUrl?: string;
}

export interface StudentProfilePrivacy {
    campusOnly: boolean;
    hideContactDetails: boolean;
}

export interface StudentProfileResponse {
    identity: StudentIdentitySnapshot;
    summary: StudentProfileSummary;
    achievements: StudentAchievement[];
    education: StudentEducation[];
    experience: StudentExperience[];
    projects: StudentProject[];
    privacy: StudentProfilePrivacy;
}

export interface UpdateStudentProfileInput {
    headline?: string;
    about?: string;
    city?: string;
    currentYear?: string;
    cgpa?: string;
    profilePicture?: string;
    skills?: string[];
    achievements?: Array<Omit<StudentAchievement, 'id'>>;
    education?: Array<Omit<StudentEducation, 'id'>>;
    experience?: Array<Omit<StudentExperience, 'id'>>;
    projects?: Array<Omit<StudentProject, 'id'>>;
}

export interface StudentDirectoryItem {
    studentId: string;
    name: string;
    departmentName: string;
    collegeName: string;
    currentYear: string;
    headline: string;
    city: string;
    about: string;
    profilePicture: string;
    skills: string[];
    achievementsCount: number;
    projectsCount: number;
}

export interface CampusChatChannel {
    id: string;
    name: string;
    slug: string;
    description: string;
    isDefault: boolean;
}

export interface CampusChatMessage {
    id: string;
    channelId: string;
    body: string;
    createdAt: string;
    mine: boolean;
    sender: {
        studentId: string;
        name: string;
        departmentName: string;
        profilePicture: string;
    };
}

export interface SendCampusChatMessageInput {
    channelId: string;
    body: string;
}
