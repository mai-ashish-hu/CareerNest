import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireTenantMatch } from '../middleware/permission.middleware';
import { requireStudent } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { campusChatController } from '../controllers/campus-chat.controller';
import { sendCampusChatMessageSchema } from '../validators/student.schema';

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireTenantMatch, requireStudent);

router.get('/channels', campusChatController.listChannels);
router.get('/messages', campusChatController.listMessages);
router.post(
    '/messages',
    validate(sendCampusChatMessageSchema),
    auditLog('CAMPUS_CHAT_MESSAGE_SEND', 'campus_chat_message'),
    campusChatController.sendMessage
);

export default router;
