// Server-side (Docker/Node): use API_URL env var; Client-side (browser): use relative path
const API_BASE = (typeof process !== 'undefined' && process.env?.API_URL)
    ? `${process.env.API_URL}/api/v1`
    : '/api/v1';

interface FetchOptions extends RequestInit { token?: string; }

/** Shape of every API response from the CareerNest server */
interface ApiResponseShape {
    success: boolean;
    data?: unknown;
    message?: string;
    error?: { code: string; message: string; details?: unknown[] };
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...options.headers as Record<string, string> };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, { ...fetchOptions, headers });
    const data = await response.json() as ApiResponseShape;
    if (!response.ok) throw new ApiClientError(data?.error?.message || 'An error occurred', data?.error?.code || 'UNKNOWN', response.status, data?.error?.details);
    return data as unknown as T;
}

export class ApiClientError extends Error {
    constructor(message: string, public code: string, public status: number, public details?: unknown[]) { super(message); }
}

export const api = {
    auth: {
        login: (email: string, password: string) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
        logout: (token: string) => apiFetch('/auth/logout', { method: 'POST', token }),
        me: (token: string) => apiFetch('/auth/me', { token }),
    },
    tenants: {
        list: (token: string, params?: string) => apiFetch(`/tenants${params ? `?${params}` : ''}`, { token }),
        getById: (token: string, id: string) => apiFetch(`/tenants/${id}`, { token }),
        create: (token: string, data: unknown) => apiFetch('/tenants', { method: 'POST', body: JSON.stringify(data), token }),
        update: (token: string, id: string, data: unknown) => apiFetch(`/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
        getTeamMembers: (token: string, id: string) => apiFetch(`/tenants/${id}/team`, { token }),
    },
    companies: {
        list: (token: string, params?: string) => apiFetch(`/companies${params ? `?${params}` : ''}`, { token }),
        getById: (token: string, id: string) => apiFetch(`/companies/${id}`, { token }),
        create: (token: string, data: unknown) => apiFetch('/companies', { method: 'POST', body: JSON.stringify(data), token }),
        update: (token: string, id: string, data: unknown) => apiFetch(`/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
    },
    drives: {
        list: (token: string, params?: string) => apiFetch(`/drives${params ? `?${params}` : ''}`, { token }),
        getById: (token: string, id: string) => apiFetch(`/drives/${id}`, { token }),
        create: (token: string, data: unknown) => apiFetch('/drives', { method: 'POST', body: JSON.stringify(data), token }),
        update: (token: string, id: string, data: unknown) => apiFetch(`/drives/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
    },
    applications: {
        list: (token: string, params?: string) => apiFetch(`/applications${params ? `?${params}` : ''}`, { token }),
        create: (token: string, data: unknown) => apiFetch('/applications', { method: 'POST', body: JSON.stringify(data), token }),
        updateStage: (token: string, id: string, stage: string) => apiFetch(`/applications/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }), token }),
    },
    students: {
        list: (token: string, params?: string) => apiFetch(`/students${params ? `?${params}` : ''}`, { token }),
        getById: (token: string, id: string) => apiFetch(`/students/${id}`, { token }),
        getMyProfile: (token: string) => apiFetch('/students/me', { token }),
        create: (token: string, data: unknown) => apiFetch('/students', { method: 'POST', body: JSON.stringify(data), token }),
        bulkCreate: (token: string, data: unknown) => apiFetch('/students/bulk', { method: 'POST', body: JSON.stringify(data), token }),
        update: (token: string, id: string, data: unknown) => apiFetch(`/students/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
    },
    courses: {
        list: (token: string, params?: string) => apiFetch(`/courses${params ? `?${params}` : ''}`, { token }),
        create: (token: string, data: unknown) => apiFetch('/courses', { method: 'POST', body: JSON.stringify(data), token }),
        delete: (token: string, id: string) => apiFetch(`/courses/${id}`, { method: 'DELETE', token }),
    },
    announcements: {
        list: (token: string, params?: string) => apiFetch(`/announcements${params ? `?${params}` : ''}`, { token }),
        create: (token: string, data: unknown) => apiFetch('/announcements', { method: 'POST', body: JSON.stringify(data), token }),
        delete: (token: string, id: string) => apiFetch(`/announcements/${id}`, { method: 'DELETE', token }),
    },
    analytics: {
        placement: (token: string) => apiFetch('/analytics/placement', { token }),
    },
    admin: {
        stats: (token: string) => apiFetch('/admin/stats', { token }),
        tenantWiseStats: (token: string) => apiFetch('/admin/stats/tenants', { token }),
        listUsers: (token: string, params?: string) => apiFetch(`/admin/users${params ? `?${params}` : ''}`, { token }),
        getUserById: (token: string, id: string) => apiFetch(`/admin/users/${id}`, { token }),
        createUser: (token: string, data: unknown) => apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(data), token }),
        updateUserStatus: (token: string, id: string, status: string) => apiFetch(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }), token }),
        listCompanies: (token: string, params?: string) => apiFetch(`/admin/companies${params ? `?${params}` : ''}`, { token }),
        updateCompanyStatus: (token: string, id: string, status: string) => apiFetch(`/admin/companies/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }), token }),
        listDrives: (token: string, params?: string) => apiFetch(`/admin/drives${params ? `?${params}` : ''}`, { token }),
        listAuditLogs: (token: string, params?: string) => apiFetch(`/admin/audit-logs${params ? `?${params}` : ''}`, { token }),
        listPlacements: (token: string, params?: string) => apiFetch(`/admin/placements${params ? `?${params}` : ''}`, { token }),
    },
};
