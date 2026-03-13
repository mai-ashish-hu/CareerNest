import { Router } from 'express';
import { interviewController } from '../controllers/interview.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireTPOOrAssistant, requireAuthenticated, requireTPOOrCompany } from '../middleware/role.middleware';
import { requireTenantMatch } from '../middleware/permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { createInterviewSchema, updateInterviewSchema } from '../validators/interview.schema';

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireTenantMatch);

// Schedule a new interview (TPO, TPO_ASSISTANT, or Company)
router.post(
    '/',
    requireTPOOrCompany,
    validate(createInterviewSchema),
    auditLog('INTERVIEW_SCHEDULE', 'interview'),
    interviewController.create
);

// List interviews (filters: driveId, status, upcoming)
router.get('/', requireAuthenticated, interviewController.list);

// Get a specific interview
router.get('/:id', requireAuthenticated, interviewController.getById);

// Update interview details (reschedule, add feedback, etc.)
router.patch(
    '/:id',
    requireTPOOrCompany,
    validate(updateInterviewSchema),
    auditLog('INTERVIEW_UPDATE', 'interview'),
    interviewController.update
);

// Cancel an interview
router.delete(
    '/:id',
    requireTPOOrCompany,
    auditLog('INTERVIEW_CANCEL', 'interview'),
    interviewController.cancel
);

// Get room details for joining a video interview
router.get('/room/:roomId', requireAuthenticated, interviewController.getRoomDetails);

export default router;
