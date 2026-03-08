export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details: unknown[];

    constructor(statusCode: number, code: string, message: string, details: unknown[] = []) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details: unknown[] = []) {
        super(400, 'VALIDATION_ERROR', message, details);
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(401, 'AUTHENTICATION_ERROR', message);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Access denied') {
        super(403, 'FORBIDDEN', message);
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(404, 'NOT_FOUND', `${resource} not found`);
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists') {
        super(409, 'CONFLICT', message);
    }
}

export class EligibilityError extends AppError {
    constructor(message: string, details: unknown[] = []) {
        super(403, 'ELIGIBILITY_FAILED', message, details);
    }
}

export class RateLimitError extends AppError {
    constructor() {
        super(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later.');
    }
}
