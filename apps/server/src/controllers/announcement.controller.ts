import { Request, Response, NextFunction } from 'express';
import { databases } from '../config/appwrite';
import { env } from '../config/env';
import { ID, Query } from 'node-appwrite';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { NotFoundError } from '../utils/errors';

export class AnnouncementController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const announcement = await databases.createDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_ANNOUNCEMENTS,
                ID.unique(),
                {
                    tenantId: req.tenantId,
                    title: req.body.title,
                    body: req.body.body,
                    createdBy: req.user!.$id,
                }
            );
            sendCreated(res, announcement);
        } catch (error) {
            next(error);
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const queries = [
                Query.limit(limit),
                Query.offset((page - 1) * limit),
                Query.orderDesc('$createdAt'),
            ];
            if (req.tenantId) {
                queries.unshift(Query.equal('tenantId', req.tenantId));
            }
            const result = await databases.listDocuments(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_ANNOUNCEMENTS,
                queries
            );
            sendPaginated(res, result.documents, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const announcement = await databases.getDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_ANNOUNCEMENTS,
                req.params.id
            );

            if (announcement.tenantId !== req.tenantId) {
                throw new NotFoundError('Announcement');
            }

            const updateData: Record<string, unknown> = {};
            if (req.body.title !== undefined) updateData.title = req.body.title;
            if (req.body.body !== undefined) updateData.body = req.body.body;

            const updated = await databases.updateDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_ANNOUNCEMENTS,
                req.params.id,
                updateData
            );
            sendSuccess(res, updated);
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const announcement = await databases.getDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_ANNOUNCEMENTS,
                req.params.id
            );

            if (announcement.tenantId !== req.tenantId) {
                throw new NotFoundError('Announcement');
            }

            await databases.deleteDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_ANNOUNCEMENTS,
                req.params.id
            );
            sendSuccess(res, { message: 'Announcement deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

export const announcementController = new AnnouncementController();
