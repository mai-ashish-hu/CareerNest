import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { defaultRateLimiter } from './middleware/rateLimit.middleware';
import { AppError } from './utils/errors';
import { sendError } from './utils/response';

// Routes
import authRoutes from './routes/auth.routes';
import tenantRoutes from './routes/tenant.routes';
import companyRoutes from './routes/company.routes';
import driveRoutes from './routes/drive.routes';
import applicationRoutes from './routes/application.routes';
import studentRoutes from './routes/student.routes';
import campusChatRoutes from './routes/campus-chat.routes';
import courseRoutes from './routes/course.routes';
import announcementRoutes from './routes/announcement.routes';
import analyticsRoutes from './routes/analytics.routes';
import adminRoutes from './routes/admin.routes';

// Jobs
import { registerEmailJobs } from './jobs/emailJob';
import { registerAnalyticsJobs } from './jobs/analyticsJob';

const app = express();

// Trust proxy headers when running behind a reverse proxy (e.g., nginx)
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ─── Global Middleware ───
app.use(helmet({
    // Disable CSP by default to avoid breaking apps; enable in production when policies are defined.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use(cors({
    origin: env.APP_URL,
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(defaultRateLimiter);

// ─── Health Check ───
app.get('/api/v1/health', (_req, res) => {
    res.json({
        status: 'healthy',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
    });
});

// ─── API Routes ───
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/drives', driveRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/campus-chat', campusChatRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/admin', adminRoutes);

// ─── 404 Handler ───
app.use((_req, res) => {
    sendError(res, 404, {
        code: 'NOT_FOUND',
        message: 'The requested endpoint does not exist',
    });
});

// ─── Global Error Handler ───
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Avoid leaking stack traces in production logs
    if (env.NODE_ENV === 'production') {
        console.error('[Error]', err.message);
    } else {
        console.error('[Error]', err);
    }

    if (err instanceof AppError) {
        sendError(res, err.statusCode, {
            code: err.code,
            message: err.message,
            details: err.details,
        });
        return;
    }

    sendError(res, 500, {
        code: 'INTERNAL_ERROR',
        message: env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message,
    });
});

// ─── Register Background Jobs ───
registerEmailJobs();
registerAnalyticsJobs();

// ─── Start Server ───
app.listen(env.PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║   CareerNest API Server                  ║
  ║   Running on: http://localhost:${env.PORT}     ║
  ║   Environment: ${env.NODE_ENV.padEnd(23)}║
  ╚══════════════════════════════════════════╝
  `);
});

export default app;
