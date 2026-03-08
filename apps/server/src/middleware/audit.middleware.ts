import { Request, Response, NextFunction } from 'express';
import { databases } from '../config/appwrite';
import { env } from '../config/env';
import { ID } from 'node-appwrite';

/**
 * Audit middleware factory: Logs sensitive actions to the AuditLogs collection.
 * @param action - The action being performed (e.g., 'DRIVE_CREATE')
 * @param resourceType - The type of resource being acted upon
 */
export function auditLog(action: string, resourceType: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Store original json method to intercept response
        const originalJson = res.json.bind(res);

        res.json = function (body: unknown) {
            // Log audit after response is prepared (non-blocking)
            if (req.user && res.statusCode < 400) {
                logAudit(req, action, resourceType, body).catch((err) => {
                    console.error('Audit log failed:', err);
                });
            }
            return originalJson(body);
        };

        next();
    };
}

async function logAudit(
    req: Request,
    action: string,
    resourceType: string,
    responseBody: unknown
): Promise<void> {
    try {
        const resourceId = extractResourceId(req, responseBody);

        await databases.createDocument(
            env.APPWRITE_DATABASE_ID,
            env.COLLECTION_AUDIT_LOGS,
            ID.unique(),
            {
                tenantId: req.tenantId || req.user?.tenantId || 'global',
                userId: req.user?.$id || 'unknown',
                action,
                resourceType,
                resourceId: resourceId || 'unknown',
                metadata: JSON.stringify({
                    method: req.method,
                    path: req.path,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                }),
                timestamp: new Date().toISOString(),
            }
        );
    } catch (error) {
        console.error('Failed to write audit log:', error);
    }
}

function extractResourceId(req: Request, responseBody: unknown): string {
    // Try to get ID from route params first
    if (req.params.id) return req.params.id;

    // Then try from response body
    if (responseBody && typeof responseBody === 'object') {
        const body = responseBody as Record<string, unknown>;
        if (body.data && typeof body.data === 'object') {
            const data = body.data as Record<string, unknown>;
            if (data.$id) return data.$id as string;
            if (data.id) return data.id as string;
        }
    }

    return 'unknown';
}
