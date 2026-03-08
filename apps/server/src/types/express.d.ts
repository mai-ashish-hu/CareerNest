import { Role } from '@careernest/shared';

declare global {
    namespace Express {
        interface Request {
            /** Authenticated user info from JWT */
            user?: {
                $id: string;
                email: string;
                name: string;
                role: Role;
                department?: string;
                tenantId?: string;
            };
            /** Resolved tenant ID for the current request */
            tenantId?: string;
        }
    }
}

export { };
