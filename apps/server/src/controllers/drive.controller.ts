import { Request, Response, NextFunction } from 'express';
import { driveService } from '../services/drive.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';

export class DriveController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const drive = await driveService.create(req.tenantId!, req.body);
            sendCreated(res, drive);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const drive = await driveService.getById(req.params.id, req.tenantId);
            sendSuccess(res, drive);
        } catch (error) {
            next(error);
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const filters = {
                companyId: req.query.companyId as string | undefined,
            };
            const result = await driveService.list(req.tenantId!, page, limit, filters);
            sendPaginated(res, result.drives, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const drive = await driveService.update(req.params.id, req.tenantId!, req.body);
            sendSuccess(res, drive);
        } catch (error) {
            next(error);
        }
    }
}

export const driveController = new DriveController();
