import { databases } from '../config/appwrite';
import { env } from '../config/env';
import { ID, Query } from 'node-appwrite';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { applicationService } from './application.service';
import { driveService } from './drive.service';

export class InterviewService {
    private readonly databaseId = env.APPWRITE_DATABASE_ID;
    private readonly collectionId = env.COLLECTION_INTERVIEWS;

    async create(tenantId: string, data: {
        applicationId: string;
        scheduledAt: string;
        durationMinutes?: number;
        format: 'video_call' | 'in_person' | 'phone';
        meetingLink?: string;
        interviewerName?: string;
        interviewerEmail?: string;
        notes?: string;
    }, requesterId: string, requesterRole: string) {
        // Fetch the application to get studentId, driveId, companyId
        const application = await applicationService.getById(data.applicationId, tenantId);

        // Companies can only schedule interviews for their own drives
        if (requesterRole === 'company') {
            await driveService.getById(application.driveId as string, tenantId, requesterId);
        }

        // Application must be in interview_scheduled stage or shortlisted
        const validStages = ['shortlisted', 'interview_scheduled'];
        if (!validStages.includes(application.stage as string)) {
            throw new ConflictError(
                `Cannot schedule interview for application in stage: ${application.stage}. Application must be shortlisted first.`
            );
        }

        // Check for duplicate interview
        const existing = await databases.listDocuments(this.databaseId, this.collectionId, [
            Query.equal('tenantId', tenantId),
            Query.equal('applicationId', data.applicationId),
            Query.equal('status', 'scheduled'),
            Query.limit(1),
        ]);

        if (existing.total > 0) {
            throw new ConflictError('An interview is already scheduled for this application');
        }

        // Get the drive for companyId
        let companyId = '';
        try {
            const drive = await driveService.getById(application.driveId as string, tenantId);
            const companyRef = (drive as any).companies;
            companyId = Array.isArray(companyRef)
                ? (companyRef[0]?.$id || companyRef[0] || '')
                : (companyRef?.$id || companyRef || '');
        } catch {
            // Ignore — drive might not be accessible
        }

        // Generate a unique room ID for video_call format
        const roomId = data.format === 'video_call'
            ? `room_${ID.unique()}`
            : undefined;

        const interviewData: Record<string, unknown> = {
            tenantId,
            applicationId: data.applicationId,
            driveId: application.driveId,
            studentId: application.studentId,
            companyId,
            scheduledAt: data.scheduledAt,
            durationMinutes: data.durationMinutes ?? 60,
            format: data.format,
            status: 'scheduled',
            notes: data.notes || '',
            interviewerName: data.interviewerName || '',
            interviewerEmail: data.interviewerEmail || '',
            result: 'pending',
        };

        if (data.format === 'video_call') {
            interviewData.roomId = roomId;
            // If meetingLink is provided, use it; otherwise generate internal platform URL
            interviewData.meetingLink = data.meetingLink || `/interview/${roomId}`;
        } else {
            interviewData.meetingLink = data.meetingLink || '';
        }

        const interview = await databases.createDocument(
            this.databaseId,
            this.collectionId,
            ID.unique(),
            interviewData,
        );

        // Update application stage to interview_scheduled if not already
        if (application.stage !== 'interview_scheduled') {
            try {
                await applicationService.updateStage(
                    data.applicationId,
                    tenantId,
                    'interview_scheduled',
                    requesterRole === 'company' ? requesterId : undefined
                );
            } catch {
                // Ignore stage update failure — interview was still created
            }
        }

        return interview;
    }

    async list(tenantId: string, page: number, limit: number, filters: {
        driveId?: string;
        studentId?: string;
        status?: string;
        upcomingOnly?: boolean;
    } = {}) {
        const queries = [
            Query.equal('tenantId', tenantId),
            Query.limit(limit),
            Query.offset((page - 1) * limit),
            Query.orderAsc('scheduledAt'),
        ];

        if (filters.driveId) queries.push(Query.equal('driveId', filters.driveId));
        if (filters.studentId) queries.push(Query.equal('studentId', filters.studentId));
        if (filters.status) queries.push(Query.equal('status', filters.status));
        if (filters.upcomingOnly) {
            queries.push(Query.greaterThanEqual('scheduledAt', new Date().toISOString()));
        }

        const result = await databases.listDocuments(this.databaseId, this.collectionId, queries);

        return {
            interviews: result.documents,
            total: result.total,
        };
    }

    async getById(interviewId: string, tenantId?: string) {
        try {
            const interview = await databases.getDocument(
                this.databaseId,
                this.collectionId,
                interviewId,
            );

            if (tenantId && interview.tenantId !== tenantId) {
                throw new NotFoundError('Interview');
            }

            return interview;
        } catch {
            throw new NotFoundError('Interview');
        }
    }

    async update(interviewId: string, tenantId: string, data: Partial<{
        scheduledAt: string;
        durationMinutes: number;
        format: string;
        meetingLink: string;
        interviewerName: string;
        interviewerEmail: string;
        notes: string;
        status: string;
        feedback: string;
        result: string;
    }>, requesterId: string, requesterRole: string) {
        const interview = await this.getById(interviewId, tenantId);

        // Companies can only update interviews for their own drives
        if (requesterRole === 'company') {
            await driveService.getById(interview.driveId as string, tenantId, requesterId);
        }

        const updateData: Record<string, unknown> = {};
        if (data.scheduledAt !== undefined) updateData.scheduledAt = data.scheduledAt;
        if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;
        if (data.format !== undefined) updateData.format = data.format;
        if (data.meetingLink !== undefined) updateData.meetingLink = data.meetingLink;
        if (data.interviewerName !== undefined) updateData.interviewerName = data.interviewerName;
        if (data.interviewerEmail !== undefined) updateData.interviewerEmail = data.interviewerEmail;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.feedback !== undefined) updateData.feedback = data.feedback;
        if (data.result !== undefined) updateData.result = data.result;

        const updated = await databases.updateDocument(
            this.databaseId,
            this.collectionId,
            interviewId,
            updateData,
        );

        return updated;
    }

    async cancel(interviewId: string, tenantId: string, requesterId: string, requesterRole: string) {
        const interview = await this.getById(interviewId, tenantId);

        if (requesterRole === 'company') {
            await driveService.getById(interview.driveId as string, tenantId, requesterId);
        }

        if (interview.status === 'completed' || interview.status === 'cancelled') {
            throw new ConflictError(`Cannot cancel interview in status: ${interview.status}`);
        }

        return await databases.updateDocument(
            this.databaseId,
            this.collectionId,
            interviewId,
            { status: 'cancelled' },
        );
    }

    /** Get room details for joining an interview (validates access) */
    async getRoomDetails(roomId: string, tenantId: string, userId: string, userRole: string) {
        const interviews = await databases.listDocuments(this.databaseId, this.collectionId, [
            Query.equal('tenantId', tenantId),
            Query.equal('roomId', roomId),
            Query.limit(1),
        ]);

        if (interviews.total === 0) {
            throw new NotFoundError('Interview room');
        }

        const interview = interviews.documents[0];

        // Verify access:
        // - Student can only join their own interview
        // - TPO/company can join any interview in their tenant
        if (userRole === 'student' && interview.studentId !== userId) {
            throw new ForbiddenError('You are not a participant in this interview');
        }

        if (interview.status === 'cancelled') {
            throw new ConflictError('This interview has been cancelled');
        }

        return {
            roomId,
            interviewId: interview.$id,
            applicationId: interview.applicationId,
            driveId: interview.driveId,
            studentId: interview.studentId,
            scheduledAt: interview.scheduledAt,
            durationMinutes: interview.durationMinutes,
            format: interview.format,
            status: interview.status,
            notes: interview.notes,
            interviewerName: interview.interviewerName,
        };
    }
}

export const interviewService = new InterviewService();
