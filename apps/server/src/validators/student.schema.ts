import { z } from 'zod';

export const createStudentSchema = z.object({
    studentId: z.string().trim().min(1, 'Student ID is required'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100),
    name: z.string().min(2, 'Name must be at least 2 characters').max(200),
    email: z.string().email('Must be a valid email'),
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

const optionalUrl = z.string().trim().refine(
    (v) => v === '' || z.string().url().safeParse(v).success,
    { message: 'Must be a valid URL' }
);

const profileAchievementSchema = z.object({
    title: z.string().trim().min(1, 'Achievement title is required').max(120),
    description: z.string().trim().min(1, 'Achievement description is required').max(500),
    certificateUrl: optionalUrl.default(''),
});

const profileEducationSchema = z.object({
    level: z.string().trim().min(1, 'Education level is required').max(80),
    institution: z.string().trim().max(160).optional().default(''),
    board: z.string().trim().max(120).optional().default(''),
    department: z.string().trim().max(120).optional().default(''),
    marks: z.string().trim().max(20).optional().default(''),
    year: z.string().trim().max(20).optional().default(''),
});

const profileExperienceSchema = z.object({
    title: z.string().trim().min(1, 'Role title is required').max(120),
    company: z.string().trim().min(1, 'Company name is required').max(120),
    description: z.string().trim().min(1, 'Experience description is required').max(600),
    start: z.string().trim().min(1, 'Start date is required').max(40),
    end: z.string().trim().min(1, 'End date is required').max(40),
    certificateUrl: optionalUrl.default(''),
});

const profileProjectSchema = z.object({
    title: z.string().trim().min(1, 'Project title is required').max(120),
    shortDescription: z.string().trim().min(1, 'Project description is required').max(500),
    technologiesUsed: z.array(z.string().trim().min(1).max(50)).max(12).default([]),
    projectUrl: optionalUrl.optional().default(''),
    repositoryUrl: optionalUrl.optional().default(''),
});

export const updateStudentProfileSchema = z.object({
    headline: z.string().trim().max(120).optional().default(''),
    about: z.string().trim().max(1200).optional().default(''),
    city: z.string().trim().max(120).optional().default(''),
    currentYear: z.string().trim().max(40).optional().default(''),
    cgpa: z.string().trim().max(20).optional().default(''),
    profilePicture: optionalUrl.optional().default(''),
    skills: z.array(z.string().trim().min(1).max(50)).max(25).default([]),
    achievements: z.array(profileAchievementSchema).max(20).default([]),
    education: z.array(profileEducationSchema).max(20).default([]),
    experience: z.array(profileExperienceSchema).max(20).default([]),
    projects: z.array(profileProjectSchema).max(20).default([]),
});

export const uploadStudentProfileAssetSchema = z.object({
    assetType: z.enum(['profile_photo', 'certificate']),
    fileName: z.string().trim().min(1, 'File name is required').max(255),
    fileType: z.string().trim().min(1, 'File type is required').max(120),
    fileBase64: z.string().trim().min(1, 'File payload is required'),
});

export const sendCampusChatMessageSchema = z.object({
    channelId: z.string().trim().min(1, 'Channel ID is required'),
    body: z.string().trim().min(1, 'Message cannot be empty').max(1000),
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
export type UpdateStudentProfileSchemaInput = z.infer<typeof updateStudentProfileSchema>;
export type UploadStudentProfileAssetSchemaInput = z.infer<typeof uploadStudentProfileAssetSchema>;
export type CreateCourseSchemaInput = z.infer<typeof createCourseSchema>;
export type CreateAnnouncementSchemaInput = z.infer<typeof createAnnouncementSchema>;
export type SendCampusChatMessageSchemaInput = z.infer<typeof sendCampusChatMessageSchema>;
