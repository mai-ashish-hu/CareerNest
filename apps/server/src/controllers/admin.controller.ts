import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';

export class AdminController {
    async getPlatformStats(_req: Request, res: Response, next: NextFunction) {
        try {
            const stats = await adminService.getPlatformStats();
            sendSuccess(res, stats);
        } catch (error) {
            next(error);
        }
    }

    async listAllUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const filters = {
                role: req.query.role as string | undefined,
                status: req.query.status as string | undefined,
                tenantId: req.query.tenantId as string | undefined,
                search: req.query.search as string | undefined,
            };
            const result = await adminService.listAllUsers(page, limit, filters);
            sendPaginated(res, result.users, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async updateUserStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await adminService.updateUserStatus(req.params.id, req.body.status);
            sendSuccess(res, user);
        } catch (error) {
            next(error);
        }
    }

    async listAllCompanies(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const filters = {
                status: req.query.status as string | undefined,
                tenantId: req.query.tenantId as string | undefined,
                search: req.query.search as string | undefined,
            };
            const result = await adminService.listAllCompanies(page, limit, filters);
            sendPaginated(res, result.companies, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async updateCompanyStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const company = await adminService.updateCompanyStatus(req.params.id, req.body.status);
            sendSuccess(res, company);
        } catch (error) {
            next(error);
        }
    }

    async listAllDrives(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const filters = {
                status: req.query.status as string | undefined,
                tenantId: req.query.tenantId as string | undefined,
            };
            const result = await adminService.listAllDrives(page, limit, filters);
            sendPaginated(res, result.drives, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async listAuditLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const filters = {
                tenantId: req.query.tenantId as string | undefined,
                userId: req.query.userId as string | undefined,
                action: req.query.action as string | undefined,
                resourceType: req.query.resourceType as string | undefined,
            };
            const result = await adminService.listAuditLogs(page, limit, filters);
            sendPaginated(res, result.logs, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async getTenantWiseStats(_req: Request, res: Response, next: NextFunction) {
        try {
            const stats = await adminService.getTenantWiseStats();
            sendSuccess(res, stats);
        } catch (error) {
            next(error);
        }
    }

    async getUserById(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await adminService.getUserById(req.params.id);
            sendSuccess(res, user);
        } catch (error) {
            next(error);
        }
    }

    async createUser(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await adminService.createUser(req.body);
            sendSuccess(res, user, 201);
        } catch (error) {
            next(error);
        }
    }

    async listAllPlacements(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const filters = {
                tenantId: req.query.tenantId as string | undefined,
            };
            const result = await adminService.listAllPlacements(page, limit, filters);
            sendPaginated(res, result.placements, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }
}

export const adminController = new AdminController();
