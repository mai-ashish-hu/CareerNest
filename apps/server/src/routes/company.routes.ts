import { Router } from 'express';
import { companyController } from '../controllers/company.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireTPO, requireAuthenticated } from '../middleware/role.middleware';
import { requireTenantMatch } from '../middleware/permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { createCompanySchema, updateCompanySchema } from '../validators/company.schema';

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireTenantMatch);

router.post('/', requireTPO, validate(createCompanySchema), auditLog('COMPANY_CREATE', 'company'), companyController.create);
router.get('/', requireAuthenticated, companyController.list);
router.get('/:id', requireAuthenticated, companyController.getById);
router.patch('/:id', requireTPO, validate(updateCompanySchema), companyController.update);

export default router;
