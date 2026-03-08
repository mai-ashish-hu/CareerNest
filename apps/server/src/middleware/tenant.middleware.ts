import { Request, Response, NextFunction } from 'express';
import { Query } from 'node-appwrite';
import { databases } from '../config/appwrite';
import { env } from '../config/env';
import { AuthenticationError } from '../utils/errors';

/**
 * In-memory cache for tenantId resolution.
 * Key: `${userId}`, Value: { tenantId, expiresAt }
 * TTL: 10 minutes — avoids hitting DB on every request for users with old JWTs.
 */
const tenantCache = new Map<string, { tenantId: string; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCachedTenantId(userId: string): string | null {
    const entry = tenantCache.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        tenantCache.delete(userId);
        return null;
    }
    return entry.tenantId;
}

function setCachedTenantId(userId: string, tenantId: string): void {
    tenantCache.set(userId, { tenantId, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Extract tenantId from a colleges relationship field (array/object/string).
 */
function extractTenantId(colleges: unknown): string | null {
    if (!colleges) return null;
    if (Array.isArray(colleges) && colleges.length > 0) {
        const first = colleges[0];
        return typeof first === 'string' ? first : (first?.$id ?? null);
    }
    if (typeof colleges === 'object' && colleges !== null) {
        return (colleges as any).$id ?? null;
    }
    if (typeof colleges === 'string') return colleges;
    return null;
}

/**
 * Resolve tenantId from the database when it's missing from the JWT.
 * Uses colleges relationship as the source of truth for tenant membership.
 */
async function resolveTenantFromDB(userId: string, email: string, role: string): Promise<string | null> {
    try {
        if (role === 'student') {
            // Try by email first (reliable), then by userid field
            let studentDoc: any = null;

            try {
                const docs = await databases.listDocuments(
                    env.APPWRITE_DATABASE_ID,
                    env.COLLECTION_STUDENTS,
                    [Query.equal('email', email), Query.limit(1)]
                );
                if (docs.total > 0) studentDoc = docs.documents[0];
            } catch { /* attribute might not exist */ }

            if (!studentDoc) {
                try {
                    const docs = await databases.listDocuments(
                        env.APPWRITE_DATABASE_ID,
                        env.COLLECTION_STUDENTS,
                        [Query.equal('userid', userId), Query.limit(1)]
                    );
                    if (docs.total > 0) studentDoc = docs.documents[0];
                } catch { /* attribute might not exist */ }
            }

            if (studentDoc) {
                return extractTenantId(studentDoc.colleges);
            }
        } else if (role === 'company') {
            // Companies: try by email
            try {
                const docs = await databases.listDocuments(
                    env.APPWRITE_DATABASE_ID,
                    env.COLLECTION_COMPANIES,
                    [Query.equal('contactEmail', email), Query.limit(1)]
                );
                if (docs.total > 0) {
                    return extractTenantId(docs.documents[0].colleges);
                }
            } catch { /* ignore */ }
        } else {
            // TPO / TPO Assistant
            try {
                const docs = await databases.listDocuments(
                    env.APPWRITE_DATABASE_ID,
                    env.COLLECTION_ADMINS,
                    [Query.equal('email', email), Query.limit(1)]
                );
                if (docs.total > 0) {
                    const userDoc = docs.documents[0];
                    return extractTenantId(userDoc.colleges) ?? userDoc.tenantId ?? null;
                }
            } catch { /* ignore */ }
        }
    } catch (err) {
        console.error('[TenantMiddleware] Failed to resolve tenantId from DB:', err);
    }
    return null;
}

/**
 * Tenant middleware: Resolves tenantId from the authenticated user's token
 * and attaches it to req.tenantId for downstream use.
 * Super Admin can optionally specify a target tenant via query param.
 * Falls back to DB lookup if tenantId is missing from the JWT.
 */
export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required before tenant resolution');
        }

        // Super admin can target a specific tenant via query param
        if (req.user.role === 'super_admin' && req.query.targetTenantId) {
            req.tenantId = req.query.targetTenantId as string;
        } else if (req.user.role === 'super_admin') {
            // Super admin without target tenant - global access
            req.tenantId = undefined;
        } else {
            // All other roles use their own tenant
            req.tenantId = req.user.tenantId;

            // Fallback: resolve from DB if tenantId is missing from JWT
            if (!req.tenantId) {
                // Check cache first
                const cached = getCachedTenantId(req.user.$id);
                if (cached) {
                    req.tenantId = cached;
                } else {
                    const resolved = await resolveTenantFromDB(req.user.$id, req.user.email, req.user.role);
                    if (resolved) {
                        req.tenantId = resolved;
                        setCachedTenantId(req.user.$id, resolved);
                    }
                }
            }
        }

        next();
    } catch (error) {
        next(error);
    }
}
