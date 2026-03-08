import { Request } from 'express';
import { APP_CONSTANTS } from '../config/constants';

export interface PaginationOptions {
    page: number;
    limit: number;
    offset: number;
}

export function parsePagination(req: Request): PaginationOptions {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
        APP_CONSTANTS.PAGINATION_MAX_LIMIT,
        Math.max(1, parseInt(req.query.limit as string, 10) || APP_CONSTANTS.PAGINATION_DEFAULT_LIMIT)
    );
    const offset = (page - 1) * limit;

    return { page, limit, offset };
}
