import { Request, Response, NextFunction } from 'express';
import { Role } from '@careernest/shared';
import { ForbiddenError, AuthenticationError } from '../utils/errors';

/**
 * Role middleware factory: Creates middleware that checks if the user has one of the allowed roles.
 * @param allowedRoles - Array of roles that are permitted to access the route
 */
export function requireRole(...allowedRoles: Role[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            if (!req.user) {
                throw new AuthenticationError('Authentication required');
            }

            if (!allowedRoles.includes(req.user.role)) {
                throw new ForbiddenError(
                    `Role '${req.user.role}' is not authorized. Required: ${allowedRoles.join(', ')}`
                );
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Shorthand middleware for Super Admin only access
 */
export const requireSuperAdmin = requireRole('super_admin');

/**
 * Shorthand middleware for TPO or higher access
 */
export const requireTPO = requireRole('super_admin', 'tpo');

/**
 * Shorthand middleware for TPO, TPO Assistant, or higher access
 */
export const requireTPOOrAssistant = requireRole('super_admin', 'tpo', 'tpo_assistant');

/**
 * Shorthand middleware for Student access
 */
export const requireStudent = requireRole('student');

/**
 * Shorthand middleware for Company access
 */
export const requireCompany = requireRole('company');

/**
 * Middleware that allows TPO or Company access
 */
export const requireTPOOrCompany = requireRole('super_admin', 'tpo', 'company');

/**
 * Middleware that allows any authenticated user
 */
export const requireAuthenticated = requireRole('super_admin', 'tpo', 'tpo_assistant', 'student', 'company');
