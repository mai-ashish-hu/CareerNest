import dotenv from 'dotenv';
import path from 'path';

// Try multiple .env locations for local dev and Docker
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
    // App
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '4000', 10),
    APP_URL: process.env.APP_URL || 'http://localhost:5173',

    // Appwrite
    APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID || '',
    APPWRITE_API_KEY: process.env.APPWRITE_API_KEY || '',

    // Database
    APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID || 'careernest_db',

    // Collections
    COLLECTION_TENANTS: process.env.COLLECTION_TENANTS || 'colleges',
    COLLECTION_ADMINS: process.env.COLLECTION_ADMINS || 'users',
    COLLECTION_USERS: process.env.COLLECTION_USERS || 'users',
    COLLECTION_STUDENTS: process.env.COLLECTION_STUDENTS || 'students',
    COLLECTION_COMPANIES: process.env.COLLECTION_COMPANIES || 'companies',
    COLLECTION_DRIVES: process.env.COLLECTION_DRIVES || 'drives',
    COLLECTION_APPLICATIONS: process.env.COLLECTION_APPLICATIONS || 'applications',
    COLLECTION_COURSES: process.env.COLLECTION_COURSES || 'courses',
    COLLECTION_ANNOUNCEMENTS: process.env.COLLECTION_ANNOUNCEMENTS || 'announcements',
    COLLECTION_PLACEMENT_RECORDS: process.env.COLLECTION_PLACEMENT_RECORDS || 'placement_records',
    COLLECTION_AUDIT_LOGS: process.env.COLLECTION_AUDIT_LOGS || 'audit_logs',

    // Storage
    APPWRITE_BUCKET_RESUMES: process.env.APPWRITE_BUCKET_RESUMES || 'resumes',

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
