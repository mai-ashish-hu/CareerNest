import { z } from 'zod';

export const createInterviewSchema = z.object({
    applicationId: z.string().min(1, 'Application ID is required'),
    scheduledAt: z.string().datetime({ offset: true }),
    durationMinutes: z.number().int().min(15).max(480).optional().default(60),
    format: z.enum(['video_call', 'in_person', 'phone']),
    meetingLink: z.union([z.string().url('Must be a valid URL'), z.literal('')]).optional().default(''),
    interviewerName: z.string().max(255).optional().default(''),
    interviewerEmail: z.union([z.string().email('Must be a valid email'), z.literal('')]).optional().default(''),
    notes: z.string().max(2000).optional().default(''),
});

export const updateInterviewSchema = z.object({
    scheduledAt: z.string().datetime({ offset: true }).optional(),
    durationMinutes: z.number().int().min(15).max(480).optional(),
    format: z.enum(['video_call', 'in_person', 'phone']).optional(),
    meetingLink: z.union([z.string().url('Must be a valid URL'), z.literal('')]).optional(),
    interviewerName: z.string().max(255).optional(),
    interviewerEmail: z.union([z.string().email('Must be a valid email'), z.literal('')]).optional(),
    notes: z.string().max(2000).optional(),
    status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']).optional(),
    feedback: z.string().max(3000).optional(),
    result: z.enum(['pending', 'pass', 'fail']).optional(),
});

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>;
