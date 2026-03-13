import dotenv from 'dotenv';
import path from 'path';

// Try multiple .env locations for local dev and Docker
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requiredEnv(name: string, value: string | undefined): string {
    if (!value || value.trim() === '') {
        throw new Error(`Environment variable ${name} is required`);
    }
    return value;
}

export const env = {
    // App
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '4000', 10),
    APP_URL: process.env.APP_URL || 'http://localhost:5173',

    // Appwrite
    APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    APPWRITE_PUBLIC_ENDPOINT:
        process.env.APPWRITE_PUBLIC_ENDPOINT
        || process.env.APPWRITE_ENDPOINT
        || 'https://cloud.appwrite.io/v1',
    APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID || '',
    APPWRITE_API_KEY: process.env.APPWRITE_API_KEY || '',

    // Database
    APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID || 'careernest_db',

    // Collections
    COLLECTION_TENANTS: process.env.COLLECTION_TENANTS || 'colleges',
    COLLECTION_ADMINS: process.env.COLLECTION_ADMINS || 'users',
    COLLECTION_USERS: process.env.COLLECTION_USERS || 'users',
    COLLECTION_STUDENTS: process.env.COLLECTION_STUDENTS || 'students',
    COLLECTION_STUDENT_PROFILES:
        process.env.COLLECTION_STUDENT_PROFILES || 'student_profiles',
    COLLECTION_STUDENT_ACHIEVEMENTS:
        process.env.COLLECTION_STUDENT_ACHIEVEMENTS || 'student_profile_achievements',
    COLLECTION_STUDENT_EDUCATION:
        process.env.COLLECTION_STUDENT_EDUCATION || 'student_profile_education',
    COLLECTION_STUDENT_EXPERIENCE:
        process.env.COLLECTION_STUDENT_EXPERIENCE || 'student_profile_experience',
    COLLECTION_STUDENT_PROJECTS:
        process.env.COLLECTION_STUDENT_PROJECTS || 'student_profile_projects',
    COLLECTION_STUDENT_SKILLS:
        process.env.COLLECTION_STUDENT_SKILLS || 'student_profile_skills',
    COLLECTION_COMPANIES: process.env.COLLECTION_COMPANIES || 'companies',
    COLLECTION_DRIVES: process.env.COLLECTION_DRIVES || 'drives',
    COLLECTION_APPLICATIONS: process.env.COLLECTION_APPLICATIONS || 'applications',
    COLLECTION_COURSES: process.env.COLLECTION_COURSES || 'courses',
    COLLECTION_DEPARTMENTS:
        process.env.COLLECTION_DEPARTMENTS
        || process.env.COLLECTION_DEPARTEMENTS
        || 'departements',
    COLLECTION_ANNOUNCEMENTS: process.env.COLLECTION_ANNOUNCEMENTS || 'announcements',
    COLLECTION_PLACEMENT_RECORDS: process.env.COLLECTION_PLACEMENT_RECORDS || 'placement_records',
    COLLECTION_AUDIT_LOGS: process.env.COLLECTION_AUDIT_LOGS || 'audit_logs',
    COLLECTION_CAMPUS_CHAT_CHANNELS:
        process.env.COLLECTION_CAMPUS_CHAT_CHANNELS || 'campus_chat_channels',
    COLLECTION_CAMPUS_CHAT_MESSAGES:
        process.env.COLLECTION_CAMPUS_CHAT_MESSAGES || 'campus_chat_messages',

    // Storage
    APPWRITE_BUCKET_RESUMES: process.env.APPWRITE_BUCKET_RESUMES || 'resumes',
    APPWRITE_BUCKET_PROFILE_PHOTOS:
        process.env.APPWRITE_BUCKET_PROFILE_PHOTOS || 'profilePhoto',
    APPWRITE_BUCKET_CERTIFICATES:
        process.env.APPWRITE_BUCKET_CERTIFICATES || 'certificates',

    // Email
    SMTP_HOST: process.env.SMTP_HOST || '',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_FROM: process.env.SMTP_FROM || 'CareerNest <noreply@careernest.com>',

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

    // JWT
    JWT_SECRET: process.env.JWT_SECRET || (() => {
        if (!process.env.JWT_SECRET && (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging')) {
            throw new Error('JWT_SECRET environment variable is required in production');
        }
        return 'default-secret-change-me';
    })(),
} as const;

// Additional sanity checks (fail fast in staging/production)
if (['production', 'staging'].includes(env.NODE_ENV)) {
    requiredEnv('APPWRITE_PROJECT_ID', env.APPWRITE_PROJECT_ID);
    requiredEnv('APPWRITE_API_KEY', env.APPWRITE_API_KEY);
    requiredEnv('JWT_SECRET', env.JWT_SECRET);
}
