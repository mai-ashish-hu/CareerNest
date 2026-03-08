import { Router } from 'express';
import { courseController } from '../controllers/course.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireTPO, requireAuthenticated } from '../middleware/role.middleware';
import { requireTenantMatch } from '../middleware/permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { createCourseSchema } from '../validators/student.schema';

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireTenantMatch);

router.post('/', requireTPO, validate(createCourseSchema), courseController.create);
router.get('/', requireAuthenticated, courseController.list);
router.delete('/:id', requireTPO, courseController.delete);

export default router;
