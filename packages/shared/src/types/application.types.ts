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

export interface Course {
    $id: string;
    tenantId: string;
    name: string;
    department: string;
    $createdAt: string;
}

export interface CreateCourseInput {
    name: string;
    department: string;
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
