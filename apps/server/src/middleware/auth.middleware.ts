import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticationError } from '../utils/errors';
import type { Role } from '@careernest/shared';

interface JWTPayload {
    userId: string;
    email: string;
    name: string;
    role: Role;
    tenantId?: string | null;
    companyId?: string | null;
    department?: string | null;
}

/**
 * Auth middleware: Verifies the JWT from Authorization header and attaches user info.
 */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AuthenticationError('No token provided');
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new AuthenticationError('Invalid token format');
        }

        // Verify JWT signature and decode
        const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

        req.user = {
            $id: decoded.userId,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role,
            tenantId: decoded.tenantId,
            companyId: decoded.companyId,
            department: decoded.department ?? undefined,
        };

        next();
    } catch (error) {
        if (error instanceof AuthenticationError) {
            next(error);
        } else {
            next(new AuthenticationError('Invalid or expired token'));
        }
    }
}

/**
 * Optional auth middleware: Doesn't throw if no token, just tries to attach user
 */
export async function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        await authMiddleware(req, _res, next);
    } catch {
        next();
    }
}
