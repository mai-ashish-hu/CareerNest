import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('Invalid email address').optional(),
    studentId: z.string().trim().min(1, 'Student ID is required').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
}).superRefine((data, ctx) => {
    if (!data.email && !data.studentId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['email'],
            message: 'Either email or studentId is required',
        });
    }
});

export type LoginInput = z.infer<typeof loginSchema>;
