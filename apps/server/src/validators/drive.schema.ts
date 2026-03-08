import { z } from 'zod';

export const createDriveSchema = z.object({
    companies: z.string().min(1, 'Company is required'),
    title: z.string().min(2, 'Job title must be at least 2 characters').max(200),
    status: z.enum(['draft', 'active', 'closed']).default('active'),
    jobLevel: z.enum(['internship', 'entry', 'junior', 'mid', 'senior']),
    jobType: z.enum(['full-time', 'part-time', 'internship', 'contract', 'freelance']),
    experience: z.enum(['fresher', '0-1', '1-2', '2-3', '3-5', '5+']),
    ctcPeriod: z.enum(['annual', 'monthly']),
    location: z.string().min(1, 'Location is required').max(255),
    vacancies: z.number().int().min(1, 'At least 1 vacancy required'),
    description: z.string().max(5000).default(''),
    salary: z.number().int().min(0, 'Salary must be a positive number'),
    deadline: z.string().min(1, 'Deadline is required'),
    department: z.array(z.enum(['CSE', 'IT', 'ECE', 'EE', 'ME', 'CE', 'Civil', 'BBA', 'MBA', 'MCA'])).min(1, 'At least one department is required'),
    studyingYear: z.enum(['1st', '2nd', '3rd', '4th', '5th', 'graduate']),
    externalLink: z.string().url('Must be a valid URL').or(z.literal('')).default(''),
    CGPA: z.number().min(0).max(10),
    Backlogs: z.number().int().min(0),
});

export const updateDriveSchema = z.object({
    title: z.string().min(2).max(200).optional(),
    status: z.enum(['draft', 'active', 'closed']).optional(),
    jobLevel: z.enum(['internship', 'entry', 'junior', 'mid', 'senior']).optional(),
    jobType: z.enum(['full-time', 'part-time', 'internship', 'contract', 'freelance']).optional(),
    experience: z.enum(['fresher', '0-1', '1-2', '2-3', '3-5', '5+']).optional(),
    ctcPeriod: z.enum(['annual', 'monthly']).optional(),
    location: z.string().min(1).max(255).optional(),
    vacancies: z.number().int().min(1).optional(),
    description: z.string().max(5000).optional(),
    salary: z.number().int().min(0).optional(),
    deadline: z.string().optional(),
    department: z.array(z.enum(['CSE', 'IT', 'ECE', 'EE', 'ME', 'CE', 'Civil', 'BBA', 'MBA', 'MCA'])).min(1).optional(),
    studyingYear: z.enum(['1st', '2nd', '3rd', '4th', '5th', 'graduate']).optional(),
    externalLink: z.string().url().or(z.literal('')).optional(),
    CGPA: z.number().min(0).max(10).optional(),
    Backlogs: z.number().int().min(0).optional(),
});

export type CreateDriveSchemaInput = z.infer<typeof createDriveSchema>;
export type UpdateDriveSchemaInput = z.infer<typeof updateDriveSchema>;
