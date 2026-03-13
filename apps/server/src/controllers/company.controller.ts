import { Request, Response, NextFunction } from 'express';
import { companyService } from '../services/company.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { ForbiddenError } from '../utils/errors';

export class CompanyController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const company = await companyService.create(req.tenantId!, req.body);
            sendCreated(res, company);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            if (req.user?.role === 'company') {
                if (!req.user.companyId) {
                    throw new ForbiddenError('Company profile not found');
                }
                if (req.params.id !== req.user.companyId) {
                    throw new ForbiddenError('You can only access your own company profile');
                }
            }

            const company = await companyService.getById(req.params.id, req.tenantId);
            sendSuccess(res, company);
        } catch (error) {
            next(error);
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);

            if (req.user?.role === 'company') {
                if (!req.user.companyId) {
                    sendPaginated(res, [], 0, page, limit);
                    return;
                }

                const company = await companyService.getById(req.user.companyId, req.tenantId);
                sendPaginated(res, page === 1 ? [company] : [], 1, page, limit);
                return;
            }

            const status = req.query.status as string | undefined;
            const result = await companyService.list(req.tenantId!, page, limit, status);
            sendPaginated(res, result.companies, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const company = await companyService.update(req.params.id, req.tenantId!, req.body);
            sendSuccess(res, company);
        } catch (error) {
            next(error);
        }
    }
}

export const companyController = new CompanyController();
