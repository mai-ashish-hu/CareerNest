import { z } from 'zod';

const tenantAdminSchema = z.object({
    name: z.string().min(2, 'Admin name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(100),
    role: z.enum(['tpo', 'admin'], { required_error: 'Role is required' }),
});

export const createTenantSchema = z.object({
    collegeId: z.string().min(2, 'College ID must be at least 2 characters').max(50),
    tag: z
        .string()
        .trim()
        .min(2, 'Tag must be at least 2 characters')
        .max(30, 'Tag must be at most 30 characters')
        .regex(/^[a-z0-9_-]+$/i, 'Tag can only contain letters, numbers, hyphens and underscores')
        .transform((value) => value.toLowerCase()),
    collegeName: z.string().min(2, 'College name must be at least 2 characters').max(100),
    address: z.string().min(1, 'Address is required').max(300),
    city: z.string().min(1, 'City is required').max(100),
    state: z.string().min(1, 'State is required').max(100),
    pincode: z.number().int('Pincode must be a number'),
    phone: z.number().int('Phone must be a number'),
    email: z.string().email('Invalid email'),
    website: z.string().url('Invalid URL'),
    establishedYear: z.number().int().min(1800).max(new Date().getFullYear()),
    admins: z.array(tenantAdminSchema).optional(),
});

export const updateTenantSchema = z.object({
    collegeName: z.string().min(2).max(100).optional(),
    address: z.string().max(300).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    pincode: z.number().int().optional(),
    phone: z.number().int().optional(),
    email: z.string().email().optional().or(z.literal('')),
    website: z.string().url().optional().or(z.literal('')),
    establishedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
});

export const createDepartmentSchema = z.object({
    departmentName: z.string().trim().min(2, 'Department name must be at least 2 characters').max(100),
    departmentHeadName: z.string().trim().min(2, 'Department head name must be at least 2 characters').max(100).optional(),
    departmentHeadEmail: z.string().trim().email('Invalid department head email').optional(),
    departmentHeadPassword: z.string().min(8, 'Department head password must be at least 8 characters').max(100).optional(),
}).superRefine((data, ctx) => {
    const hasName = Boolean(data.departmentHeadName && data.departmentHeadName.trim().length > 0);
    const hasEmail = Boolean(data.departmentHeadEmail && data.departmentHeadEmail.trim().length > 0);
    const hasPassword = Boolean(data.departmentHeadPassword && data.departmentHeadPassword.trim().length > 0);

    const providedCount = [hasName, hasEmail, hasPassword].filter(Boolean).length;
    if (providedCount > 0 && providedCount < 3) {
        if (!hasName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['departmentHeadName'],
                message: 'Department head name is required',
            });
        }
        if (!hasEmail) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['departmentHeadEmail'],
                message: 'Department head email is required',
            });
        }
        if (!hasPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['departmentHeadPassword'],
                message: 'Department head password is required',
            });
        }
    }
});

export type CreateTenantSchemaInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantSchemaInput = z.infer<typeof updateTenantSchema>;
