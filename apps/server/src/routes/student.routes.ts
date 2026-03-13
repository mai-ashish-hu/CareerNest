import { Router } from 'express';
import { studentController } from '../controllers/student.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireTPOOrAssistant, requireStudent, requireAuthenticated } from '../middleware/role.middleware';
import { requireTenantMatch, requireSelfAccess } from '../middleware/permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { auditLog } from '../middleware/audit.middleware';
import {
    createStudentSchema,
    bulkCreateStudentSchema,
    updateStudentSchema,
    updateStudentProfileSchema,
    uploadStudentProfileAssetSchema,
} from '../validators/student.schema';

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireTenantMatch);

router.post('/', requireTPOOrAssistant, validate(createStudentSchema), auditLog('STUDENT_CREATE', 'student'), studentController.create);
router.post('/bulk', requireTPOOrAssistant, validate(bulkCreateStudentSchema), auditLog('STUDENT_BULK_CREATE', 'student'), studentController.bulkCreate);
router.get('/me', requireStudent, studentController.getMyProfile);
router.patch(
    '/me/profile',
    requireStudent,
    validate(updateStudentProfileSchema),
    auditLog('STUDENT_PROFILE_UPDATE', 'student_profile'),
    studentController.updateMyProfile
);
router.post(
    '/me/profile/upload',
    requireStudent,
    validate(uploadStudentProfileAssetSchema),
    auditLog('STUDENT_PROFILE_ASSET_UPLOAD', 'student_profile'),
    studentController.uploadMyProfileAsset
);
router.get('/directory', requireStudent, studentController.searchDirectory);
router.get('/directory/:id', requireStudent, studentController.getCampusProfile);
router.get('/', requireTPOOrAssistant, studentController.list);
router.get('/:id', requireAuthenticated, requireSelfAccess, studentController.getById);
router.patch('/:id', requireStudent, requireSelfAccess, validate(updateStudentSchema), auditLog('STUDENT_UPDATE', 'student'), studentController.update);

export default router;
