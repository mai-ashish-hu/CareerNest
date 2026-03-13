import { databases } from '../config/appwrite';
import { env } from '../config/env';
import { ID, Query } from 'node-appwrite';
import { NotFoundError, ConflictError } from '../utils/errors';
import { ApplicationStage } from '@careernest/shared';
import { scoringService } from './scoring.service';
import { driveService } from './drive.service';

export class ApplicationService {
    private readonly databaseId = env.APPWRITE_DATABASE_ID;
    private readonly collectionId = env.COLLECTION_APPLICATIONS;

    async create(tenantId: string, studentId: string, driveId: string, formData: Record<string, unknown> = {}) {
        // Check for duplicate application
        const existing = await databases.listDocuments(this.databaseId, this.collectionId, [
            Query.equal('tenantId', tenantId),
            Query.equal('driveId', driveId),
            Query.equal('studentId', studentId),
            Query.limit(1),
        ]);

        if (existing.total > 0) {
            throw new ConflictError('You have already applied to this drive');
        }

        // Get drive — driveService.getById verifies tenant ownership via company relationship
        const drive = await driveService.getById(driveId, tenantId);

        // Check drive status (only block if status is explicitly non-active)
        if (drive.status && drive.status !== 'active') {
            throw new ConflictError('This drive is not currently accepting applications');
        }

        // Check deadline
        if (new Date(drive.deadline as string) < new Date()) {
            throw new ConflictError('Application deadline has passed');
        }

        // Get student profile for eligibility check (studentId is the student document ID)
        let student: any;
        try {
            student = await databases.getDocument(
                this.databaseId,
                env.COLLECTION_STUDENTS,
                studentId
            );
        } catch {
            throw new NotFoundError('Student profile');
        }

        // Construct eligibility rules from drive's direct fields (CGPA, Backlogs, department)
        const eligibilityRules = {
            minCGPA: (drive.CGPA as number) ?? 0,
            maxBacklogs: (drive.Backlogs as number) ?? 10,
            departments: Array.isArray(drive.department)
                ? (drive.department as string[])
                : (drive.department ? [drive.department as string] : []),
        };

        // Check eligibility only when rules are meaningful
        if (eligibilityRules.departments.length > 0) {
            const deptField = (student as any).departements || (student as any).departments || student.department;
            const studentDept = typeof deptField === 'object' && deptField !== null
                ? (deptField.$id || deptField.departmentName || '')
                : String(deptField || '');
            scoringService.enforceEligibility(
                {
                    CGPA: (student.CGPA as number) ?? 0,
                    backlogs: (student.backlogs as number) ?? 0,
                    department: studentDept,
                },
                eligibilityRules
            );
        }

        // Create application
        const application = await databases.createDocument(
            this.databaseId,
            this.collectionId,
            ID.unique(),
            {
                tenantId,
                driveId,
                studentId,
                stage: 'applied',
                appliedAt: new Date().toISOString(),
                phoneNumber: (formData.phoneNumber as string) || '',
                currentCity: (formData.currentCity as string) || '',
                degree: (formData.degree as string) || '',
                branch: (formData.branch as string) || '',
                academicYear: (formData.academicYear as string) || '',
                graduationYear: formData.graduationYear ? Number(formData.graduationYear) : null,
                cgpa: formData.cgpa != null ? Number(formData.cgpa) : null,
                hasBacklogs: formData.hasBacklogs === true || formData.hasBacklogs === 'true',
                backlogCount: formData.backlogCount ? Number(formData.backlogCount) : 0,
                skills: (formData.skills as string) || null,
                coverLetter: (formData.coverLetter as string) || null,
                resumeFileId: (formData.resumeFileId as string) || null,
                agreedToTerms: true,
            }
        );

        return application;
    }

    async getById(applicationId: string, tenantId?: string | null) {
        try {
            const application = await databases.getDocument(this.databaseId, this.collectionId, applicationId);

            if (tenantId && application.tenantId !== tenantId) {
                throw new NotFoundError('Application');
            }

            return application;
        } catch {
            throw new NotFoundError('Application');
        }
    }

    async list(
        tenantId: string,
        page: number,
        limit: number,
        filters: { driveId?: string; studentId?: string; stage?: string } = {}
    ) {
        const queries = [
            Query.equal('tenantId', tenantId),
            Query.limit(limit),
            Query.offset((page - 1) * limit),
            Query.orderDesc('appliedAt'),
        ];

        if (filters.driveId) queries.push(Query.equal('driveId', filters.driveId));
        if (filters.studentId) queries.push(Query.equal('studentId', filters.studentId));
        if (filters.stage) queries.push(Query.equal('stage', filters.stage));

        const result = await databases.listDocuments(this.databaseId, this.collectionId, queries);

        return {
            applications: result.documents,
            total: result.total,
        };
    }

    async updateStage(applicationId: string, tenantId: string, newStage: ApplicationStage, companyId?: string | null) {
        const application = await this.getById(applicationId, tenantId);

        if (companyId) {
            await driveService.getById(application.driveId as string, tenantId, companyId);
        }

        // Validate stage transition
        scoringService.validateStageTransition(
            application.stage as ApplicationStage,
            newStage
        );

        const updated = await databases.updateDocument(
            this.databaseId,
            this.collectionId,
            applicationId,
            { stage: newStage }
        );

        // If selected, create placement record
        if (newStage === 'selected') {
            await this.createPlacementRecord(tenantId, application);
        }

        return updated;
    }

    private async createPlacementRecord(tenantId: string, application: Record<string, unknown>) {
        try {
            const drive = await databases.getDocument(
                this.databaseId,
                env.COLLECTION_DRIVES,
                application.driveId as string
            );

            // Extract company ID from the 'companies' relationship field
            const companyRef = (drive as any).companies;
            const companyId = Array.isArray(companyRef)
                ? (companyRef[0]?.$id || companyRef[0])
                : (companyRef?.$id || companyRef || null);

            await databases.createDocument(
                this.databaseId,
                env.COLLECTION_PLACEMENT_RECORDS,
                ID.unique(),
                {
                    tenantId,
                    studentId: application.studentId,
                    driveId: application.driveId,
                    companyId,
                    ctcOffered: drive.salary,          // drive uses 'salary', not 'CTC'
                    placedAt: new Date().toISOString(),
                }
            );

            // Update student isPlaced status (studentId is the student document ID)
            if (application.studentId) {
                await databases.updateDocument(
                    this.databaseId,
                    env.COLLECTION_STUDENTS,
                    application.studentId as string,
                    { isPlaced: true }
                );
            }
        } catch (error) {
            console.error('Failed to create placement record:', error);
        }
    }
}

export const applicationService = new ApplicationService();
