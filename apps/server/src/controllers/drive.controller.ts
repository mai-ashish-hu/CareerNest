import { Request, Response, NextFunction } from 'express';
import { driveService } from '../services/drive.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { ForbiddenError } from '../utils/errors';

export class DriveController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = { ...req.body };

            if (req.user?.role === 'company') {
                if (!req.user.companyId) {
                    throw new ForbiddenError('Company profile not found');
                }
                payload.companies = req.user.companyId;
            }

            const drive = await driveService.create(req.tenantId!, payload);
            sendCreated(res, drive);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.role === 'company' ? req.user.companyId : undefined;
            if (req.user?.role === 'company' && !companyId) {
                throw new ForbiddenError('Company profile not found');
            }

            const drive = await driveService.getById(req.params.id, req.tenantId, companyId);
            sendSuccess(res, drive);
        } catch (error) {
            next(error);
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const filters = {
                companyId: req.user?.role === 'company'
                    ? req.user.companyId ?? undefined
                    : req.query.companyId as string | undefined,
            };

            if (req.user?.role === 'company' && !filters.companyId) {
                sendPaginated(res, [], 0, page, limit);
                return;
            }

            const result = await driveService.list(req.tenantId!, page, limit, filters);
            sendPaginated(res, result.drives, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.role === 'company' ? req.user.companyId : undefined;
            if (req.user?.role === 'company' && !companyId) {
                throw new ForbiddenError('Company profile not found');
            }

            const drive = await driveService.update(req.params.id, req.tenantId!, req.body, companyId);
            sendSuccess(res, drive);
        } catch (error) {
            next(error);
        }
    }
}

export const driveController = new DriveController();
