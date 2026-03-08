import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

/**
 * Validation middleware factory: Validates request body against a Zod schema.
 * @param schema - Zod schema to validate against
 */
export function validate(schema: ZodSchema) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            const result = schema.safeParse(req.body);

            if (!result.success) {
                const errors = result.error.errors.map((err: ZodError['errors'][0]) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));

                throw new ValidationError('Validation failed', errors);
            }

            // Replace body with parsed (and potentially transformed) data
            req.body = result.data;
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Validates query parameters against a Zod schema
 */
export function validateQuery(schema: ZodSchema) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            const result = schema.safeParse(req.query);

            if (!result.success) {
                const errors = result.error.errors.map((err: ZodError['errors'][0]) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));

                throw new ValidationError('Query parameter validation failed', errors);
            }

            req.query = result.data;
            next();
        } catch (error) {
            next(error);
        }
    };
}
