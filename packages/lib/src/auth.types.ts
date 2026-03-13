export interface SessionUser {
    id: string;
    role: string;
    name: string;
    email: string;
    tenantId?: string | null;
    companyId?: string | null;
    department?: string | null;
}
