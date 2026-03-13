import { Router } from 'express';
import { driveController } from '../controllers/drive.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireTPOOrCompany, requireAuthenticated, requireTPOOrAssistant } from '../middleware/role.middleware';
import { requireTenantMatch } from '../middleware/permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { createDriveSchema, updateDriveSchema } from '../validators/drive.schema';

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireTenantMatch);

router.post('/', requireTPOOrCompany, validate(createDriveSchema), auditLog('DRIVE_CREATE', 'drive'), driveController.create);
router.get('/', requireAuthenticated, driveController.list);
router.get('/:id', requireAuthenticated, driveController.getById);
// Get all applications for a drive with enriched student details (for selection management)
router.get('/:id/applications', requireTPOOrAssistant, driveController.getApplications);
router.patch('/:id', requireTPOOrCompany, validate(updateDriveSchema), auditLog('DRIVE_UPDATE', 'drive'), driveController.update);
router.delete('/:id', requireTPOOrCompany, auditLog('DRIVE_DELETE', 'drive'), driveController.delete);

export default router;
