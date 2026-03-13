import { Request, Response, NextFunction } from 'express';
import { studentService } from '../services/student.service';
import { studentProfileService } from '../services/student-profile.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';

function sanitizeStudentDoc(student: any) {
    if (!student || typeof student !== 'object') return student;
    const { password, ...rest } = student;
    return rest;
}

export class StudentController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const student = await studentService.create(req.tenantId!, req.body);
            sendCreated(res, sanitizeStudentDoc(student));
        } catch (error) {
            next(error);
        }
    }

    async bulkCreate(req: Request, res: Response, next: NextFunction) {
        try {
            const results = await studentService.bulkCreate(req.tenantId!, req.body.students);
            sendCreated(res, {
                ...results,
                success: (results.success || []).map((student: any) => sanitizeStudentDoc(student)),
            });
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const student = await studentService.getById(req.params.id, req.tenantId);
            sendSuccess(res, sanitizeStudentDoc(student));
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
            sendPaginated(
                res,
                (result.students || []).map((student: any) => sanitizeStudentDoc(student)),
                result.total,
                page,
                limit
            );
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const studentId = req.params.id;
            const student = await studentService.update(studentId, req.tenantId!, req.body);
            sendSuccess(res, sanitizeStudentDoc(student));
        } catch (error) {
            next(error);
        }
    }

    async getMyProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const student = await studentProfileService.getMyProfile(
                req.user!.$id,
                req.tenantId!,
                req.user!.email
            );
            sendSuccess(res, student);
        } catch (error) {
            next(error);
        }
    }

    async updateMyProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const profile = await studentProfileService.updateMyProfile(
                req.user!.$id,
                req.tenantId!,
                req.user!.email,
                req.body
            );
            sendSuccess(res, profile);
        } catch (error) {
            next(error);
        }
    }

    async uploadMyProfileAsset(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await studentProfileService.uploadProfileAsset(
                req.user!.$id,
                req.tenantId!,
                req.user!.email,
                req.body
            );
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    async searchDirectory(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const query = String(req.query.q || '');
            const result = await studentProfileService.searchDirectory(req.tenantId!, query, page, limit);
            sendPaginated(res, result.students, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async getCampusProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const profile = await studentProfileService.getCampusProfile(req.params.id, req.tenantId!);
            sendSuccess(res, profile);
        } catch (error) {
            next(error);
        }
    }
}

export const studentController = new StudentController();
