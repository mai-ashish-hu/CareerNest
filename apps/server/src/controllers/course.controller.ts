import { Request, Response, NextFunction } from 'express';
import { databases } from '../config/appwrite';
import { env } from '../config/env';
import { ID, Query } from 'node-appwrite';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { NotFoundError } from '../utils/errors';

export class CourseController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const course = await databases.createDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_COURSES,
                ID.unique(),
                {
                    tenantId: req.tenantId,
                    name: req.body.name,
                    department: req.body.department,
                }
            );
            sendCreated(res, course);
        } catch (error) {
            next(error);
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const result = await databases.listDocuments(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_COURSES,
                [
                    Query.equal('tenantId', req.tenantId!),
                    Query.limit(limit),
                    Query.offset((page - 1) * limit),
                    Query.orderDesc('$createdAt'),
                ]
            );
            sendPaginated(res, result.documents, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const course = await databases.getDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_COURSES,
                req.params.id
            );

            if (course.tenantId !== req.tenantId) {
                throw new NotFoundError('Course');
            }

            await databases.deleteDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_COURSES,
                req.params.id
            );
            sendSuccess(res, { message: 'Course deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

export const courseController = new CourseController();
