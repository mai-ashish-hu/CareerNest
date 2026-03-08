import { Response } from 'express';
import { ApiResponse, ApiError } from '@careernest/shared';

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
    const response: ApiResponse<T> = {
        success: true,
        data,
    };
    res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T): void {
    sendSuccess(res, data, 201);
}

export function sendMessage(res: Response, message: string, statusCode: number = 200): void {
    const response: ApiResponse = {
        success: true,
        message,
    };
    res.status(statusCode).json(response);
}

export function sendError(res: Response, statusCode: number, error: ApiError): void {
    const response: ApiResponse = {
        success: false,
        error,
    };
    res.status(statusCode).json(response);
}

export function sendPaginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number
): void {
    res.status(200).json({
        success: true,
        data,
        total,
        page,
        limit,
    });
}
