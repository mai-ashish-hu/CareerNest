import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { sendSuccess } from '../utils/response';

export class AnalyticsController {
    async getPlacementAnalytics(req: Request, res: Response, next: NextFunction) {
        try {
            const analytics = await analyticsService.getPlacementAnalytics(req.tenantId!);
            sendSuccess(res, analytics);
        } catch (error) {
            next(error);
        }
    }
}

export const analyticsController = new AnalyticsController();
