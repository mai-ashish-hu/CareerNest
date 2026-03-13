import { Router } from 'express';
import { databases } from '../config/appwrite';
import { env } from '../config/env';
import { ID, Query } from 'node-appwrite';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireAuthenticated } from '../middleware/role.middleware';
import { requireTenantMatch } from '../middleware/permission.middleware';
import { sendSuccess, sendCreated } from '../utils/response';
import { NotFoundError } from '../utils/errors';

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireTenantMatch);

/**
 * POST /interview-signal/:roomId
 * Send a WebRTC signal (offer, answer, candidate, join, leave) to the room.
 */
router.post('/rooms/:roomId/signals', requireAuthenticated, async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const { type, targetId, data } = req.body;

        // Verify the room exists in interviews
        const rooms = await databases.listDocuments(
            env.APPWRITE_DATABASE_ID,
            env.COLLECTION_INTERVIEWS,
            [Query.equal('roomId', roomId), Query.limit(1)],
        );

        if (rooms.total === 0) {
            throw new NotFoundError('Interview room');
        }

        const signal = await databases.createDocument(
            env.APPWRITE_DATABASE_ID,
            env.COLLECTION_INTERVIEW_SIGNALS,
            ID.unique(),
            {
                roomId,
                senderId: req.user!.$id,
                senderName: req.user!.name || 'Participant',
                type: type || 'signal',
                targetId: targetId || null,
                data: typeof data === 'string' ? data : JSON.stringify(data),
                tenantId: req.tenantId,
            }
        );

        sendCreated(res, signal);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /interview-signal/:roomId
 * Poll for signals since a given timestamp. Optionally filter by targetId.
 * Clients should call this every 1-2 seconds.
 */
router.get('/rooms/:roomId/signals', requireAuthenticated, async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const since = req.query.since as string;
        const limit = Math.min(parseInt(req.query.limit as string || '50'), 100);

        const queries = [
            Query.equal('roomId', roomId),
            Query.equal('tenantId', req.tenantId!),
            Query.limit(limit),
            Query.orderAsc('$createdAt'),
        ];

        if (since) {
            queries.push(Query.greaterThan('$createdAt', since));
        }

        const result = await databases.listDocuments(
            env.APPWRITE_DATABASE_ID,
            env.COLLECTION_INTERVIEW_SIGNALS,
            queries,
        );

        sendSuccess(res, {
            signals: result.documents,
            total: result.total,
            serverTime: new Date().toISOString(),
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /interview-signal/rooms/:roomId
 * Clean up all signals for a room (called when all participants leave).
 */
router.delete('/rooms/:roomId', requireAuthenticated, async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const result = await databases.listDocuments(
            env.APPWRITE_DATABASE_ID,
            env.COLLECTION_INTERVIEW_SIGNALS,
            [Query.equal('roomId', roomId), Query.limit(500)],
        );

        await Promise.allSettled(
            result.documents.map(doc =>
                databases.deleteDocument(env.APPWRITE_DATABASE_ID, env.COLLECTION_INTERVIEW_SIGNALS, doc.$id)
            )
        );

        sendSuccess(res, { deleted: result.documents.length });
    } catch (error) {
        next(error);
    }
});

export default router;
