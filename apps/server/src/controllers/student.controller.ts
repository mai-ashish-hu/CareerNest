import { Request, Response, NextFunction } from 'express';
import { studentService } from '../services/student.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';

export class StudentController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const student = await studentService.create(req.tenantId!, req.body);
            sendCreated(res, student);
        } catch (error) {
            next(error);
        }
    }

    async bulkCreate(req: Request, res: Response, next: NextFunction) {
        try {
            const results = await studentService.bulkCreate(req.tenantId!, req.body.students);
            sendCreated(res, results);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const student = await studentService.getById(req.params.id, req.tenantId);
            sendSuccess(res, student);
        } catch (error) {
            next(error);
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const filters = {
                department: req.query.department as string | undefined,
            };

            // TPO Assistant can only see their department
            if (req.user?.role === 'tpo_assistant' && req.user.department) {
                filters.department = req.user.department;
            }

            const result = await studentService.list(req.tenantId!, page, limit, filters);
            sendPaginated(res, result.students, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const studentId = req.params.id;
            const student = await studentService.update(studentId, req.tenantId!, req.body);
            sendSuccess(res, student);
        } catch (error) {
            next(error);
        }
    }

    async getMyProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const student = await studentService.getByUserId(
                req.user!.$id,
                req.tenantId,
                req.user!.email
            );
            sendSuccess(res, student);
        } catch (error) {
            next(error);
        }
    }
}

export const studentController = new StudentController();
