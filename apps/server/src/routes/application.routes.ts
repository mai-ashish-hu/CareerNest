import { Router } from 'express';
import { applicationController } from '../controllers/application.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireStudent, requireTPOOrCompany, requireAuthenticated } from '../middleware/role.middleware';
import { requireTenantMatch } from '../middleware/permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { createApplicationSchema, updateApplicationStageSchema } from '../validators/application.schema';

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireTenantMatch);

router.post('/', requireStudent, validate(createApplicationSchema), auditLog('APPLICATION_CREATE', 'application'), applicationController.create);
router.get('/', requireAuthenticated, applicationController.list);
router.patch('/:id/stage', requireTPOOrCompany, validate(updateApplicationStageSchema), auditLog('STAGE_UPDATE', 'application'), applicationController.updateStage);

export default router;
