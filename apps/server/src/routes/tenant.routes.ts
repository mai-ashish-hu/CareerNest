import { Router, Request, Response, NextFunction } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireSuperAdmin, requireTPO } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { createTenantSchema, updateTenantSchema, createDepartmentSchema } from '../validators/tenant.schema';
import { ForbiddenError } from '../utils/errors';

const router = Router();

// Common auth + tenant
router.use(authMiddleware, tenantMiddleware);

/**
 * Ensures a TPO can only access their own tenant (super_admin can access any).
 */
function requireOwnTenant(req: Request, _res: Response, next: NextFunction): void {
    if (req.user?.role === 'super_admin') return next();
    if (req.tenantId && req.params.id === req.tenantId) return next();
    // Backward compatibility: allow legacy token tenant key until users re-login.
    if (req.user?.tenantId && req.params.id === req.user.tenantId) return next();
    next(new ForbiddenError('You can only access your own college'));
}

// Super-admin-only routes
router.post('/', requireSuperAdmin, validate(createTenantSchema), auditLog('TENANT_CREATE', 'tenant'), tenantController.create);
router.get('/', requireSuperAdmin, tenantController.list);
router.patch('/:id', requireSuperAdmin, validate(updateTenantSchema), auditLog('TENANT_UPDATE', 'tenant'), tenantController.update);

// TPO can view their own tenant info & team
router.get('/:id/departments', requireTPO, requireOwnTenant, tenantController.listDepartments);
router.post('/:id/departments', requireTPO, requireOwnTenant, validate(createDepartmentSchema), auditLog('DEPARTMENT_CREATE', 'department'), tenantController.createDepartment);
router.delete('/:id/departments/:departmentId', requireTPO, requireOwnTenant, auditLog('DEPARTMENT_DELETE', 'department'), tenantController.deleteDepartment);
router.get('/:id/students', requireTPO, requireOwnTenant, tenantController.listStudents);
router.get('/:id', requireTPO, requireOwnTenant, tenantController.getById);
router.get('/:id/team', requireTPO, requireOwnTenant, tenantController.getTeamMembers);

export default router;
