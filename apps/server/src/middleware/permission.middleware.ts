import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, AuthenticationError } from '../utils/errors';

/**
 * Permission middleware: Fine-grained permission checks beyond role-based access.
 * Handles:
 * - TPO Assistant department scoping
 * - Student self-access only
 * - Company own-data access only
 */

/**
 * Ensures the user can only access their own data (for students)
 * Checks req.params.id against req.user.$id
 */
export function requireSelfAccess(req: Request, _res: Response, next: NextFunction): void {
    try {
        if (!req.user) {
            throw new AuthenticationError();
        }

        // Super admin and TPO can access anyone
        if (req.user.role === 'super_admin' || req.user.role === 'tpo') {
            return next();
        }

        // TPO assistant - checked by department in service layer
        if (req.user.role === 'tpo_assistant') {
            return next();
        }

        // Students and companies can only access their own data
        const targetId = req.params.id;
        if (targetId && targetId !== req.user.$id) {
            throw new ForbiddenError('You can only access your own data');
        }

        next();
    } catch (error) {
        next(error);
    }
}

/**
 * Ensures tenant isolation - the requested resource belongs to the user's tenant
 * This is enforced at the query level in services, but this adds a route-level check
 */
export function requireTenantMatch(req: Request, _res: Response, next: NextFunction): void {
    try {
        if (!req.user) {
            throw new AuthenticationError();
        }

        // Super admin bypasses tenant check
        if (req.user.role === 'super_admin') {
            return next();
        }

        // tenantId must be set for non-super-admin users
        if (!req.tenantId) {
            throw new ForbiddenError('Tenant context required');
        }

        next();
    } catch (error) {
        next(error);
    }
}
