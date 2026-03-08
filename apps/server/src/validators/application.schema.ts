import { z } from 'zod';

const DEGREE_OPTIONS = ['B.Tech', 'M.Tech', 'BCA', 'MCA', 'BSc', 'MSc', 'MBA', 'PhD', 'Diploma', 'Other'] as const;
const ACADEMIC_YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate'] as const;

export const createApplicationSchema = z.object({
    driveId: z.string().min(1, 'Drive ID is required'),
    phoneNumber: z.string().min(10, 'Enter a valid phone number').max(15),
    currentCity: z.string().min(1, 'City is required').max(100),
    degree: z.enum(DEGREE_OPTIONS, { errorMap: () => ({ message: 'Select a valid degree' }) }),
    branch: z.string().min(1, 'Branch is required').max(100),
    academicYear: z.enum(ACADEMIC_YEAR_OPTIONS, { errorMap: () => ({ message: 'Select a valid year' }) }),
    graduationYear: z.number().int().min(2020).max(2035, 'Enter a valid graduation year'),
    cgpa: z.number().min(0, 'CGPA cannot be negative').max(10, 'CGPA cannot exceed 10'),
    hasBacklogs: z.boolean(),
    backlogCount: z.number().int().min(0).max(50),
    skills: z.string().max(2000).optional(),
    coverLetter: z.string().max(5000).optional(),
    resumeFileId: z.string().max(255).optional(),
    agreedToTerms: z.literal(true, { errorMap: () => ({ message: 'You must agree to the terms to submit' }) }),
});

export const updateApplicationStageSchema = z.object({
    stage: z.enum([
        'under_review',
        'shortlisted',
        'interview_scheduled',
        'selected',
        'rejected',
    ]),
});

export type CreateApplicationSchemaInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationStageSchemaInput = z.infer<typeof updateApplicationStageSchema>;
