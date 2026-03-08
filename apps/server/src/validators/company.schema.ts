import { z } from 'zod';

export const createCompanySchema = z.object({
    name: z.string().min(2, 'Company name must be at least 2 characters').max(200),
    contactEmail: z.string().email('Invalid contact email'),
    contactPhone: z.string().min(10, 'Invalid phone number').max(15),
    contactPerson: z.string().min(2, 'Contact person name required').max(100),
    password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export const updateCompanySchema = z.object({
    name: z.string().min(2).max(200).optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().min(10).max(15).optional(),
    contactPerson: z.string().min(2).max(100).optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

export type CreateCompanySchemaInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanySchemaInput = z.infer<typeof updateCompanySchema>;
