import { Request, Response, NextFunction } from 'express';
import { tenantService } from '../services/tenant.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';

export class TenantController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const tenant = await tenantService.create(req.body);
            sendCreated(res, tenant);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const tenant = await tenantService.getById(req.params.id);
            sendSuccess(res, tenant);
        } catch (error) {
            next(error);
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const result = await tenantService.list(page, limit);
            sendPaginated(res, result.tenants, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const tenant = await tenantService.update(req.params.id, req.body);
            sendSuccess(res, tenant);
        } catch (error) {
            next(error);
        }
    }

    async getTeamMembers(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await tenantService.getTeamMembers(req.params.id);
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }
}

export const tenantController = new TenantController();
