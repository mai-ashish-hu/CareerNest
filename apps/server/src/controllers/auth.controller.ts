import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess, sendMessage } from '../utils/response';

export class AuthController {
    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, studentId, password } = req.body;
            // Returns { token (session secret), user }
            const result = await authService.login(email, password, studentId);
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    async logout(_req: Request, res: Response, _next: NextFunction) {
        // Session is managed on the frontend cookie; backend is stateless
        sendMessage(res, 'Logged out successfully');
    }

    async me(req: Request, res: Response, next: NextFunction) {
        try {
            sendSuccess(res, { user: req.user });
        } catch (error) {
            next(error);
        }
    }
}

export const authController = new AuthController();
