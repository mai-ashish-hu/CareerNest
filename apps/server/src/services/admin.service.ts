import { databases, users as appwriteUsers } from '../config/appwrite';
import { env } from '../config/env';
import { Query } from 'node-appwrite';
import { mapLabelsToRole } from '../utils/label-role';

/** Safely count documents in a collection; returns 0 if the collection doesn't exist yet. */
async function safeCount(db: string, collection: string, queries: string[] = [Query.limit(1)]) {
    try {
        const res = await databases.listDocuments(db, collection, queries);
        return res.total;
    } catch {
        return 0;
    }
}

async function mapInBatches<T, R>(
    items: T[],
    batchSize: number,
    mapper: (item: T) => Promise<R>
): Promise<R[]> {
    const results: R[] = [];
    for (let index = 0; index < items.length; index += batchSize) {
        const batch = items.slice(index, index + batchSize);
        const batchResults = await Promise.all(batch.map(mapper));
        results.push(...batchResults);
    }
    return results;
}

export class AdminService {
    private readonly db = env.APPWRITE_DATABASE_ID;

    /** Platform-wide stats for Super Admin dashboard */
    async getPlatformStats() {
        // Use Appwrite Auth Users API for user count
        const authUsers = await appwriteUsers.list([], undefined).catch(() => ({ total: 0 }));

        const [totalTenants, totalStudents, totalCompanies, totalDrives, totalApplications, totalPlacements] =
            await Promise.all([
                safeCount(this.db, env.COLLECTION_TENANTS),
                safeCount(this.db, env.COLLECTION_STUDENTS),
                safeCount(this.db, env.COLLECTION_COMPANIES),
                safeCount(this.db, env.COLLECTION_DRIVES),
                safeCount(this.db, env.COLLECTION_APPLICATIONS),
                safeCount(this.db, env.COLLECTION_PLACEMENT_RECORDS),
            ]);

        const [activeDrives, placedStudents] = await Promise.all([
            safeCount(this.db, env.COLLECTION_DRIVES, [Query.equal('status', 'active'), Query.limit(1)]),
            safeCount(this.db, env.COLLECTION_STUDENTS, [Query.equal('isPlaced', true), Query.limit(1)]),
        ]);

        return {
            totalTenants,
            activeTenants: totalTenants, // simplified — no status field on tenant anymore
            totalUsers: authUsers.total,
            totalStudents,
            placedStudents,
            totalCompanies,
            totalDrives,
            activeDrives,
            totalApplications,
            totalPlacements,
            placementRate: totalStudents > 0
                ? Math.round((placedStudents / totalStudents) * 100)
                : 0,
        };
    }

    /** List all Appwrite Auth users (for super admin oversight) */
    async listAllUsers(page: number, limit: number, filters: {
        role?: string;
        status?: string;
        tenantId?: string;
        search?: string;
    }) {
        // When role filtering is requested, Appwrite doesn't support label-based queries natively.
        // Fetch a larger batch and filter in-memory to approximate pagination.
        const fetchLimit = filters.role ? Math.min(500, limit * 20) : limit;
        const fetchOffset = filters.role ? 0 : (page - 1) * limit;

        const queries: string[] = [
            Query.limit(fetchLimit),
            Query.offset(fetchOffset),
            Query.orderDesc('$createdAt'),
        ];

        const result = await appwriteUsers.list(queries, filters.search || undefined);

        // Map Appwrite Auth users to a flat shape for the frontend
        let users = result.users.map((u) => ({
            $id: u.$id,
            name: u.name,
            email: u.email,
            status: u.status ? 'active' : 'blocked',
            role: mapLabelsToRole(u.labels ?? []) ?? 'unknown',
            labels: u.labels ?? [],
            $createdAt: u.$createdAt,
        }));

        // Client-side filter by role (Appwrite doesn't support label filtering natively)
        if (filters.role) {
            users = users.filter((u) => u.role === filters.role);
        }

        // Apply manual pagination when role filter is active
        const total = filters.role ? users.length : result.total;
        if (filters.role) {
            const start = (page - 1) * limit;
            users = users.slice(start, start + limit);
        }

        return { users, total };
    }

    /** Update user status via Appwrite Auth (true = active, false = blocked) */
    async updateUserStatus(userId: string, status: string) {
        const active = status === 'active';
        return await appwriteUsers.updateStatus(userId, active);
    }

    /** List all companies across all tenants */
    async listAllCompanies(page: number, limit: number, filters: {
        status?: string;
        tenantId?: string;
        search?: string;
    }) {
        const queries = [
            Query.limit(limit),
            Query.offset((page - 1) * limit),
            Query.orderDesc('$createdAt'),
        ];

        if (filters.status) queries.push(Query.equal('status', filters.status));
        if (filters.tenantId) queries.push(Query.equal('tenantId', filters.tenantId));
        if (filters.search) queries.push(Query.search('name', filters.search));

        try {
            const result = await databases.listDocuments(this.db, env.COLLECTION_COMPANIES, queries);
            return { companies: result.documents, total: result.total };
        } catch {
            return { companies: [], total: 0 };
        }
    }

    /** Update company status */
    async updateCompanyStatus(companyId: string, status: string) {
        return await databases.updateDocument(
            this.db,
            env.COLLECTION_COMPANIES,
            companyId,
            { status }
        );
    }

    /** List all drives across all tenants */
    async listAllDrives(page: number, limit: number, filters: {
        status?: string;
        tenantId?: string;
    }) {
        const queries = [
            Query.limit(limit),
            Query.offset((page - 1) * limit),
            Query.orderDesc('$createdAt'),
        ];

        if (filters.status) queries.push(Query.equal('status', filters.status));
        if (filters.tenantId) queries.push(Query.equal('tenantId', filters.tenantId));

        try {
            const result = await databases.listDocuments(this.db, env.COLLECTION_DRIVES, queries);
            return { drives: result.documents, total: result.total };
        } catch {
            return { drives: [], total: 0 };
        }
    }

    /** List audit logs across all tenants */
    async listAuditLogs(page: number, limit: number, filters: {
        tenantId?: string;
        userId?: string;
        action?: string;
        resourceType?: string;
    }) {
        const queries = [
            Query.limit(limit),
            Query.offset((page - 1) * limit),
            Query.orderDesc('timestamp'),
        ];

        if (filters.tenantId) queries.push(Query.equal('tenantId', filters.tenantId));
        if (filters.userId) queries.push(Query.equal('userId', filters.userId));
        if (filters.action) queries.push(Query.equal('action', filters.action));
        if (filters.resourceType) queries.push(Query.equal('resourceType', filters.resourceType));

        try {
            const result = await databases.listDocuments(this.db, env.COLLECTION_AUDIT_LOGS, queries);
            return { logs: result.documents, total: result.total };
        } catch {
            return { logs: [], total: 0 };
        }
    }

    /** Get tenant-wise stats for analytics */
    async getTenantWiseStats() {
        try {
            const tenants = await databases.listDocuments(this.db, env.COLLECTION_TENANTS, [
                Query.limit(100),
                Query.orderDesc('$createdAt'),
            ]);

            const stats = await mapInBatches(tenants.documents, 10, async (tenant) => {
                    const [totalStudents, totalCompanies, totalDrives, totalPlacements] =
                        await Promise.all([
                            safeCount(this.db, env.COLLECTION_STUDENTS, [
                                Query.equal('tenantId', tenant.$id), Query.limit(1),
                            ]),
                            safeCount(this.db, env.COLLECTION_COMPANIES, [
                                Query.equal('tenantId', tenant.$id), Query.limit(1),
                            ]),
                            safeCount(this.db, env.COLLECTION_DRIVES, [
                                Query.equal('tenantId', tenant.$id), Query.limit(1),
                            ]),
                            safeCount(this.db, env.COLLECTION_PLACEMENT_RECORDS, [
                                Query.equal('tenantId', tenant.$id), Query.limit(1),
                            ]),
                        ]);

                    return {
                        tenantId: tenant.$id,
                        tenantName: tenant.collegeName,
                        collegeId: tenant.collegeId,
                        totalStudents,
                        totalCompanies,
                        totalDrives,
                        totalPlacements,
                    };
                });

            return stats;
        } catch {
            return [];
        }
    }

    /** Get a single user by ID via Appwrite Auth */
    async getUserById(userId: string) {
        const user = await appwriteUsers.get(userId);
        return {
            $id: user.$id,
            name: user.name,
            email: user.email,
            status: user.status ? 'active' : 'blocked',
            role: mapLabelsToRole(user.labels ?? []) ?? 'unknown',
            labels: user.labels ?? [],
            $createdAt: user.$createdAt,
        };
    }

    /** Create a new user via Appwrite Auth (for super admin to add TPOs etc.) */
    async createUser(data: {
        email: string;
        name: string;
        password: string;
        role: string;
        tenantId?: string;
    }) {
        const { ID } = await import('node-appwrite');

        // Create the Auth user
        const newUser = await appwriteUsers.create(
            ID.unique(),
            data.email,
            undefined, // phone
            data.password,
            data.name,
        );

        // Assign the role as an Appwrite Auth Label
        const labelMap: Record<string, string> = {
            super_admin: 'SuperAdmin',
            tpo: 'TPO',
            tpo_assistant: 'TPOAssistant',
            student: 'Student',
            company: 'Company',
        };

        const label = labelMap[data.role];
        if (label) {
            await appwriteUsers.updateLabels(newUser.$id, [label]);
        }

        // When tenantId is supplied and the role is a college-level role,
        // create a user document in COLLECTION_ADMINS so the TPO/assistant
        // can resolve their college on login.
        const isCollegeRole = data.role === 'tpo' || data.role === 'tpo_assistant' || data.role === 'admin';
        if (data.tenantId && isCollegeRole) {
            const tenantId = data.tenantId.trim();
            // Many-to-one relationship: colleges field expects a single document ID string.
            const userDocPayloads: Array<Record<string, unknown>> = [
                { name: data.name, email: data.email, colleges: tenantId, tenantId },
                { name: data.name, email: data.email, colleges: tenantId },
                { name: data.name, email: data.email, tenantId },
                { name: data.name, email: data.email },
            ];
            for (const payload of userDocPayloads) {
                try {
                    await databases.createDocument(
                        env.APPWRITE_DATABASE_ID,
                        env.COLLECTION_ADMINS,
                        ID.unique(),
                        payload,
                    );
                    break;
                } catch {
                    // Try next payload variant
                }
            }
        }

        return {
            $id: newUser.$id,
            name: newUser.name,
            email: newUser.email,
            role: data.role,
        };
    }

    /** List placement records across all tenants */
    async listAllPlacements(page: number, limit: number, filters: {
        tenantId?: string;
    }) {
        const queries = [
            Query.limit(limit),
            Query.offset((page - 1) * limit),
            Query.orderDesc('placedAt'),
        ];

        if (filters.tenantId) queries.push(Query.equal('tenantId', filters.tenantId));

        try {
            const result = await databases.listDocuments(this.db, env.COLLECTION_PLACEMENT_RECORDS, queries);
            return { placements: result.documents, total: result.total };
        } catch {
            return { placements: [], total: 0 };
        }
    }
}

export const adminService = new AdminService();
