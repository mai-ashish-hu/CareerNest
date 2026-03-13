import { NextFunction, Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../utils/response';
import { campusChatService } from '../services/campus-chat.service';

export class CampusChatController {
    async listChannels(req: Request, res: Response, next: NextFunction) {
        try {
            const channels = await campusChatService.listChannels(req.tenantId!);
            sendSuccess(res, channels);
        } catch (error) {
            next(error);
        }
    }

    async listMessages(req: Request, res: Response, next: NextFunction) {
        try {
            const channelId = String(req.query.channelId || '');
            const messages = await campusChatService.listMessages(
                req.tenantId!,
                channelId,
                req.user!.$id
            );
            sendSuccess(res, messages);
        } catch (error) {
            next(error);
        }
    }

    async sendMessage(req: Request, res: Response, next: NextFunction) {
        try {
            const message = await campusChatService.sendMessage(
                req.tenantId!,
                req.user!.$id,
                req.user!.email,
                req.body
            );
            sendCreated(res, message);
        } catch (error) {
            next(error);
        }
    }
}

export const campusChatController = new CampusChatController();
