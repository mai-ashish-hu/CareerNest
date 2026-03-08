export interface Tenant {
    $id: string;
    collegeId: string;
    collegeName: string;
    address: string;
    city: string;
    state: string;
    pincode: number;
    phone: number;
    email: string;
    website: string;
    establishedYear: number;
    $createdAt: string;
    $updatedAt: string;
}

export type AdminRole = 'tpo' | 'admin';

export interface TenantAdminInput {
    name: string;
    email: string;
    password: string;
    role: AdminRole;
}

export interface CreateTenantInput {
    collegeId: string;
    collegeName: string;
    address: string;
    city: string;
    state: string;
    pincode: number;
    phone: number;
    email: string;
    website: string;
    establishedYear: number;
    admins?: TenantAdminInput[];
}

export interface UpdateTenantInput {
    collegeName?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: number;
    phone?: number;
    email?: string;
    website?: string;
    establishedYear?: number;
}
