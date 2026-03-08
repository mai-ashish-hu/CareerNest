import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireTPO } from '../middleware/role.middleware';
import { requireTenantMatch } from '../middleware/permission.middleware';

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireTenantMatch);

router.get('/placement', requireTPO, analyticsController.getPlacementAnalytics);

export default router;
