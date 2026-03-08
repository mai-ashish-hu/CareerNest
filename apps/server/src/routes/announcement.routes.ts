import { Router } from 'express';
import { announcementController } from '../controllers/announcement.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireTPO, requireRole } from '../middleware/role.middleware';
import { requireTenantMatch } from '../middleware/permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { createAnnouncementSchema } from '../validators/student.schema';

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireTenantMatch);

router.post('/', requireTPO, validate(createAnnouncementSchema), auditLog('ANNOUNCEMENT_CREATE', 'announcement'), announcementController.create);
router.get('/', requireRole('super_admin', 'tpo', 'tpo_assistant', 'student'), announcementController.list);
router.delete('/:id', requireTPO, announcementController.delete);

export default router;
