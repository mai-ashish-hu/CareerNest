import { Request, Response, NextFunction } from 'express';
import { applicationService } from '../services/application.service';
import { driveService } from '../services/drive.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { ForbiddenError } from '../utils/errors';

export class ApplicationController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const application = await applicationService.create(
                req.tenantId!,
                req.user!.$id,
                req.body.driveId,
                req.body
            );
            sendCreated(res, application);
        } catch (error) {
            next(error);
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const filters: { driveId?: string; studentId?: string; stage?: string } = {};

            if (req.query.driveId) filters.driveId = req.query.driveId as string;
            if (req.query.stage) filters.stage = req.query.stage as string;

            // Students can only see their own applications
            if (req.user?.role === 'student') {
                filters.studentId = req.user.$id;
            }

            // Companies can only see applications for their drives
            if (req.user?.role === 'company') {
                if (!req.user.companyId) {
                    sendPaginated(res, [], 0, page, limit);
                    return;
                }
                if (!filters.driveId) {
                    // Company must specify a driveId, or we return empty
                    sendPaginated(res, [], 0, page, limit);
                    return;
                }

                await driveService.getById(filters.driveId, req.tenantId, req.user.companyId);
            }

            const result = await applicationService.list(req.tenantId!, page, limit, filters);
            sendPaginated(res, result.applications, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async updateStage(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.role === 'company' ? req.user.companyId : undefined;
            if (req.user?.role === 'company' && !companyId) {
                throw new ForbiddenError('Company profile not found');
            }

            const application = await applicationService.updateStage(
                req.params.id,
                req.tenantId!,
                req.body.stage,
                companyId
            );
            sendSuccess(res, application);
        } catch (error) {
            next(error);
        }
    }
}

export const applicationController = new ApplicationController();
