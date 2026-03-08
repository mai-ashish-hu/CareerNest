import { z } from 'zod';

const tenantAdminSchema = z.object({
    name: z.string().min(2, 'Admin name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(100),
    role: z.enum(['tpo', 'admin'], { required_error: 'Role is required' }),
});

export const createTenantSchema = z.object({
    collegeId: z.string().min(2, 'College ID must be at least 2 characters').max(50),
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

export type CreateTenantSchemaInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantSchemaInput = z.infer<typeof updateTenantSchema>;
