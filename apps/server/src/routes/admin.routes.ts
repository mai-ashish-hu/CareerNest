import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireSuperAdmin } from '../middleware/role.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

// All admin routes require super admin
router.use(authMiddleware, tenantMiddleware, requireSuperAdmin);

// Platform stats
router.get('/stats', adminController.getPlatformStats);
router.get('/stats/tenants', adminController.getTenantWiseStats);

// Cross-tenant user governance
router.get('/users', adminController.listAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', auditLog('USER_CREATE', 'user'), adminController.createUser);
router.patch('/users/:id/status', auditLog('USER_STATUS_UPDATE', 'user'), adminController.updateUserStatus);

// Cross-tenant company oversight
router.get('/companies', adminController.listAllCompanies);
router.patch('/companies/:id/status', auditLog('COMPANY_STATUS_UPDATE', 'company'), adminController.updateCompanyStatus);

// Cross-tenant drive monitoring
router.get('/drives', adminController.listAllDrives);

// Audit logs
router.get('/audit-logs', adminController.listAuditLogs);

// Placement records
router.get('/placements', adminController.listAllPlacements);

export default router;
