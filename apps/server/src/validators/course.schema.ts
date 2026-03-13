import { z } from 'zod';

const optionalUrl = z.string().trim().refine(
    (v) => v === '' || z.string().url().safeParse(v).success,
    { message: 'Must be a valid URL' }
);

export const createCourseSchema = z.object({
    name: z.string().min(2, 'Course name must be at least 2 characters').max(200),
    department: z.string().max(100).optional().default(''),
    courseType: z.enum(['video', 'link', 'livestream']).default('link'),
    contentLink: optionalUrl.optional().default(''),
    videoFileId: z.string().max(255).optional().default(''),
    videoFileName: z.string().max(500).optional().default(''),
    videoFileType: z.string().max(120).optional().default(''),
    videoBase64: z.string().optional().default(''),
    streamUrl: z.union([z.string().url('Must be a valid URL'), z.literal('')]).optional().default(''),
    streamStartTime: z.string().datetime({ offset: true }).optional().or(z.literal('')).default(''),
    thumbnailUrl: z.union([z.string().url('Must be a valid URL'), z.literal('')]).optional().default(''),
    instructor: z.string().max(255).optional().default(''),
    isPublished: z.boolean().optional().default(true),
});

export const updateCourseSchema = z.object({
    name: z.string().min(2).max(200).optional(),
    department: z.string().max(100).optional(),
    instructor: z.string().max(255).optional(),
    isPublished: z.boolean().optional(),
    contentLink: optionalUrl.optional(),
    streamUrl: z.union([z.string().url(), z.literal('')]).optional(),
    streamStartTime: z.string().datetime({ offset: true }).optional().or(z.literal('')),
    thumbnailUrl: z.union([z.string().url(), z.literal('')]).optional(),
});

export type CreateCourseSchemaInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseSchemaInput = z.infer<typeof updateCourseSchema>;
