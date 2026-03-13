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

    async listDepartments(req: Request, res: Response, next: NextFunction) {
        try {
            const departments = await tenantService.listDepartments(req.params.id);
            sendSuccess(res, departments);
        } catch (error) {
            next(error);
        }
    }

    async createDepartment(req: Request, res: Response, next: NextFunction) {
        try {
            const department = await tenantService.createDepartment(
                req.params.id,
                req.body.departmentName,
                {
                    currentUserEmail: req.user?.email,
                    departmentHeadName: req.body.departmentHeadName,
                    departmentHeadEmail: req.body.departmentHeadEmail,
                    departmentHeadPassword: req.body.departmentHeadPassword,
                },
            );
            sendCreated(res, department);
        } catch (error) {
            next(error);
        }
    }

    async deleteDepartment(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await tenantService.deleteDepartment(req.params.id, req.params.departmentId);
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    async listStudents(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const filters = {
                department: req.query.department as string | undefined,
            };
            const result = await tenantService.listStudents(req.params.id, page, limit, filters);
            sendPaginated(res, result.students, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }
}

export const tenantController = new TenantController();
