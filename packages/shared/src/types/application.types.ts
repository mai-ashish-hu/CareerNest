import { ApplicationStage } from '../constants/stages';

export interface Application {
    $id: string;
    tenantId: string;
    driveId: string;
    studentId: string;
    stage: ApplicationStage;
    appliedAt: string;
    $updatedAt: string;
    // Form snapshot fields (captured at application time)
    phoneNumber: string;
    currentCity: string;
    degree: string;
    branch: string;
    academicYear: string;
    graduationYear: number;
    cgpa: number;
    hasBacklogs: boolean;
    backlogCount: number;
    skills?: string;
    coverLetter?: string;
    resumeFileId?: string;
    agreedToTerms: boolean;
}

export interface ApplicationWithStudent extends Application {
    student: {
        $id: string;
        name: string;
        email: string;
        phoneNumber: string;
        enrollmentYear: number | null;
        departmentName: string;
        cgpa: number | null;
        currentYear: string | null;
        profilePicture: string;
        headline: string;
        isPlaced: boolean;
    };
}

export interface CreateApplicationInput {
    driveId: string;
    phoneNumber: string;
    currentCity: string;
    degree: string;
    branch: string;
    academicYear: string;
    graduationYear: number;
    cgpa: number;
    hasBacklogs: boolean;
    backlogCount: number;
    skills?: string;
    coverLetter?: string;
    resumeFileId?: string;
    agreedToTerms: true;
}

export interface UpdateApplicationStageInput {
    stage: ApplicationStage;
}

export type CourseType = 'video' | 'link' | 'livestream';

export interface Course {
    $id: string;
    tenantId: string;
    name: string;
    department: string;
    courseType: CourseType;
    contentLink?: string;
    videoFileId?: string;
    videoUrl?: string;       // Generated URL (returned by getById)
    streamUrl?: string;
    streamStartTime?: string;
    thumbnailUrl?: string;
    instructor?: string;
    isPublished: boolean;
    $createdAt: string;
    $updatedAt: string;
}

export interface CreateCourseInput {
    name: string;
    department?: string;
    courseType: CourseType;
    contentLink?: string;
    videoFileId?: string;
    videoFileName?: string;
    videoFileType?: string;
    videoBase64?: string;
    streamUrl?: string;
    streamStartTime?: string;
    thumbnailUrl?: string;
    instructor?: string;
    isPublished?: boolean;
}

export type InterviewFormat = 'video_call' | 'in_person' | 'phone';
export type InterviewStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export type InterviewResult = 'pending' | 'pass' | 'fail';

export interface Interview {
    $id: string;
    tenantId: string;
    applicationId: string;
    driveId: string;
    studentId: string;
    companyId: string;
    scheduledAt: string;
    durationMinutes: number;
    format: InterviewFormat;
    roomId?: string;
    meetingLink?: string;
    interviewerName?: string;
    interviewerEmail?: string;
    notes?: string;
    status: InterviewStatus;
    feedback?: string;
    result: InterviewResult;
    $createdAt: string;
    $updatedAt: string;
}

export interface CreateInterviewInput {
    applicationId: string;
    scheduledAt: string;
    durationMinutes?: number;
    format: InterviewFormat;
    meetingLink?: string;
    interviewerName?: string;
    interviewerEmail?: string;
    notes?: string;
}

export interface Announcement {
    $id: string;
    tenantId: string;
    title: string;
    body: string;
    createdBy: string;
    $createdAt: string;
}

export interface CreateAnnouncementInput {
    title: string;
    body: string;
}

export interface PlacementRecord {
    $id: string;
    tenantId: string;
    studentId: string;
    driveId: string;
    companyId: string;
    ctcOffered: number;
    placedAt: string;
}

export interface AuditLog {
    $id: string;
    tenantId: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
    timestamp: string;
}
