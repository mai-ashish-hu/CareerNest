import { Request, Response, NextFunction } from 'express';
import { interviewService } from '../services/interview.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';

export class InterviewController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const interview = await interviewService.create(
                req.tenantId!,
                req.body,
                req.user!.$id,
                req.user!.role,
            );
            sendCreated(res, interview);
        } catch (error) {
            next(error);
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const filters: {
                driveId?: string;
                studentId?: string;
                status?: string;
                upcomingOnly?: boolean;
            } = {};

            if (req.query.driveId) filters.driveId = req.query.driveId as string;
            if (req.query.status) filters.status = req.query.status as string;
            if (req.query.upcoming === 'true') filters.upcomingOnly = true;

            // Students can only see their own interviews
            if (req.user?.role === 'student') {
                filters.studentId = req.user.$id;
            }

            const result = await interviewService.list(req.tenantId!, page, limit, filters);
            sendPaginated(res, result.interviews, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const interview = await interviewService.getById(req.params.id, req.tenantId!);
            sendSuccess(res, interview);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const interview = await interviewService.update(
                req.params.id,
                req.tenantId!,
                req.body,
                req.user!.$id,
                req.user!.role,
            );
            sendSuccess(res, interview);
        } catch (error) {
            next(error);
        }
    }

    async cancel(req: Request, res: Response, next: NextFunction) {
        try {
            const interview = await interviewService.cancel(
                req.params.id,
                req.tenantId!,
                req.user!.$id,
                req.user!.role,
            );
            sendSuccess(res, interview);
        } catch (error) {
            next(error);
        }
    }

    async getRoomDetails(req: Request, res: Response, next: NextFunction) {
        try {
            const room = await interviewService.getRoomDetails(
                req.params.roomId,
                req.tenantId!,
                req.user!.$id,
                req.user!.role,
            );
            sendSuccess(res, room);
        } catch (error) {
            next(error);
        }
    }
}

export const interviewController = new InterviewController();
