import { z } from 'zod';

export const createStudentSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(200),
    email: z.string().email('Must be a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    department: z.string().min(1, 'Department is required'),
    enrollmentYear: z.number().int().min(2000).max(2100),
    phoneNumber: z.number().int(),
    address: z.string().min(1, 'Address is required').max(500),
});

export const bulkCreateStudentSchema = z.object({
    students: z.array(createStudentSchema).min(1, 'At least one student required').max(500, 'Maximum 500 students per batch'),
});

export const updateStudentSchema = z.object({
    department: z.string().min(1).optional(),
    enrollmentYear: z.number().int().min(2000).max(2100).optional(),
    phoneNumber: z.number().int().optional(),
    address: z.string().max(500).optional(),
});

export const createCourseSchema = z.object({
    name: z.string().min(2, 'Course name must be at least 2 characters').max(200),
    department: z.string().min(2, 'Department name required').max(100),
});

export const createAnnouncementSchema = z.object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(200),
    body: z.string().min(1, 'Body is required').max(5000),
});

export type UpdateStudentSchemaInput = z.infer<typeof updateStudentSchema>;
export type CreateCourseSchemaInput = z.infer<typeof createCourseSchema>;
export type CreateAnnouncementSchemaInput = z.infer<typeof createAnnouncementSchema>;
