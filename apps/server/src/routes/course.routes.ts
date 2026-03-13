import { Router } from 'express';
import { courseController } from '../controllers/course.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireTPOOrAssistant, requireAuthenticated } from '../middleware/role.middleware';
import { requireTenantMatch } from '../middleware/permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { createCourseSchema, updateCourseSchema } from '../validators/course.schema';

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireTenantMatch);

router.post('/', requireTPOOrAssistant, validate(createCourseSchema), courseController.create);
router.get('/', requireAuthenticated, courseController.list);
router.get('/:id', requireAuthenticated, courseController.getById);
router.patch('/:id', requireTPOOrAssistant, validate(updateCourseSchema), courseController.update);
router.delete('/:id', requireTPOOrAssistant, courseController.delete);

export default router;
