import { databases, users as appwriteUsers, teams as appwriteTeams } from '../config/appwrite';
import { env } from '../config/env';
import { ID, Query } from 'node-appwrite';
import { NotFoundError, ConflictError, ValidationError, ServiceUnavailableError } from '../utils/errors';
import { CreateTenantInput, UpdateTenantInput } from '@careernest/shared';
import { studentService } from './student.service';

interface CreateDepartmentOptions {
    currentUserEmail?: string;
    departmentHeadName?: string;
    departmentHeadEmail?: string;
    departmentHeadPassword?: string;
}

interface DepartmentHeadContext {
    authUserId: string;
    userDocId?: string;
}

export class TenantService {
    private readonly databaseId = env.APPWRITE_DATABASE_ID;
    private readonly collectionId = env.COLLECTION_TENANTS;
    private readonly adminsCollectionId = env.COLLECTION_ADMINS;
    private readonly departmentsCollectionId = env.COLLECTION_DEPARTMENTS;

    private sanitizeStudentDoc(student: any) {
        if (!student || typeof student !== 'object') return student;
        const { password, ...rest } = student;
        return rest;
    }

    private normalizeDepartmentName(rawName: string): string {
        return rawName.trim().replace(/\s+/g, ' ');
    }

    private extractRelationshipIds(value: unknown): string[] {
        if (!value) return [];
        if (typeof value === 'string') return [value];
        if (Array.isArray(value)) {
            return value
                .map((item) => {
                    if (!item) return null;
                    if (typeof item === 'string') return item;
                    if (typeof item === 'object' && '$id' in item && typeof (item as any).$id === 'string') {
                        return (item as any).$id;
                    }
                    return null;
                })
                .filter((id): id is string => Boolean(id));
        }
        if (typeof value === 'object' && '$id' in value && typeof (value as any).$id === 'string') {
            return [(value as any).$id];
        }
        return [];
    }

    private buildTenantAliases(tenant: any): Set<string> {
        const aliases = new Set<string>();
        if (tenant?.$id && typeof tenant.$id === 'string') aliases.add(tenant.$id);
        if (tenant?.collegeId && typeof tenant.collegeId === 'string') aliases.add(tenant.collegeId);
        return aliases;
    }

    private isUnknownAttributeError(error: unknown, attribute: string): boolean {
        const message = (error as any)?.response?.message || (error as Error)?.message || '';
        return typeof message === 'string' && message.includes(`Unknown attribute: "${attribute}"`);
    }

    private isAlreadyExistsError(error: unknown): boolean {
        const message = ((error as any)?.response?.message || (error as Error)?.message || '').toLowerCase();
        return message.includes('already exists') || message.includes('already in use');
    }

    private isRelationshipValueError(error: unknown): boolean {
        return (error as any)?.type === 'relationship_value_invalid';
    }

    private isAppwriteConnectivityError(error: unknown): boolean {
        const message = String((error as any)?.message || (error as any)?.response?.message || '');
        const cause = (error as any)?.cause;
        const causeMessage = String(cause?.message || '');
        const causeCode = String(cause?.code || '');

        return message.includes('fetch failed')
            || causeCode === 'EAI_AGAIN'
            || causeCode === 'ENOTFOUND'
            || causeCode === 'ECONNREFUSED'
            || causeCode === 'ETIMEDOUT'
            || causeMessage.includes('EAI_AGAIN')
            || causeMessage.includes('ENOTFOUND')
            || causeMessage.includes('ECONNREFUSED')
            || causeMessage.includes('ETIMEDOUT');
    }

    private rethrowIfConnectivityError(error: unknown): void {
        if (this.isAppwriteConnectivityError(error)) {
            throw new ServiceUnavailableError(
                'Unable to reach Appwrite right now. Please retry in a moment.'
            );
        }
    }

    private async findTenantTeamId(tenant: any): Promise<string | null> {
        const collegeName = String(tenant?.collegeName || '').trim();
        const collegeId = String(tenant?.collegeId || '').trim();
        if (!collegeName || !collegeId) return null;

        const searchName = `${collegeName} (${collegeId})`;
        const teamsList = await appwriteTeams.list([], searchName);
        if (teamsList.total === 0) return null;

        const team = teamsList.teams.find((entry) => entry.name === searchName) || teamsList.teams[0];
        return team?.$id || null;
    }

    private async rollbackDepartmentHead(context?: DepartmentHeadContext): Promise<void> {
        if (!context) return;

        if (context.userDocId) {
            try {
                await databases.deleteDocument(this.databaseId, this.adminsCollectionId, context.userDocId);
            } catch {
                // Best-effort rollback only.
            }
        }

        try {
            await appwriteUsers.delete(context.authUserId);
        } catch {
            // Best-effort rollback only.
        }
    }

    private async createDepartmentHead(
        tenant: any,
        tenantDocId: string,
        departmentName: string,
        rawName: string,
        rawEmail: string,
        password: string,
    ): Promise<DepartmentHeadContext> {
        const name = rawName.trim();
        const email = rawEmail.trim().toLowerCase();
        if (!name || !email || !password) {
            throw new ValidationError('Department head name, email, and password are required');
        }

        try {
            const existingByEmail = await databases.listDocuments(
                this.databaseId,
                this.adminsCollectionId,
                [Query.equal('email', email), Query.limit(50)],
            );
            const existsInCollege = existingByEmail.documents.some((userDoc: any) => {
                const linkedColleges = this.extractRelationshipIds(userDoc.colleges);
                return linkedColleges.includes(tenantDocId) || String(userDoc.tenantId || '') === tenantDocId;
            });
            if (existsInCollege) {
                throw new ConflictError(`User '${email}' already exists in this college`);
            }
        } catch (error) {
            if (error instanceof ConflictError) throw error;
            // Continue: older schemas may not support exact query strategy.
        }

        let authUser: { $id: string } | null = null;
        try {
            authUser = await appwriteUsers.create(ID.unique(), email, undefined, password, name);
        } catch (error) {
            if (this.isAlreadyExistsError(error)) {
                throw new ConflictError(`Auth user '${email}' already exists`);
            }
            throw error;
        }

        try {
            await appwriteUsers.updateLabels(authUser.$id, ['deptHead']);

            const teamId = await this.findTenantTeamId(tenant);
            if (!teamId) {
                throw new ValidationError('Unable to find college team for department head assignment');
            }

            await appwriteTeams.createMembership(
                teamId,
                ['deptHead'],
                email,
                authUser.$id,
                undefined,
                undefined,
                name,
            );

            // Many-to-one relationship: colleges field expects a single document ID string.
            const payloadCandidates: Array<Record<string, unknown>> = [
                { name, email, colleges: tenantDocId, tenantId: tenantDocId, department: departmentName },
                { name, email, colleges: tenantDocId, department: departmentName },
                { name, email, colleges: tenantDocId, tenantId: tenantDocId },
                { name, email, colleges: tenantDocId },
                { name, email, tenantId: tenantDocId, department: departmentName },
                { name, email, tenantId: tenantDocId },
                { name, email },
            ].map((payload) => Object.fromEntries(
                Object.entries(payload).filter(([, value]) => value !== undefined),
            ));

            let lastError: unknown;
            for (const payload of payloadCandidates) {
                try {
                    const userDoc = await databases.createDocument(
                        this.databaseId,
                        this.adminsCollectionId,
                        ID.unique(),
                        payload,
                    );
                    return {
                        authUserId: authUser.$id,
                        userDocId: String((userDoc as any).$id),
                    };
                } catch (error) {
                    lastError = error;
                    continue;
                }
            }

            throw (lastError as Error) || new ValidationError('Unable to create department head user record');
        } catch (error) {
            await this.rollbackDepartmentHead({
                authUserId: authUser.$id,
            });
            throw error;
        }
    }

    private async listTenantUserDocIds(tenantDocId: string): Promise<Set<string>> {
        const userIds = new Set<string>();

        try {
            const byRelation = await databases.listDocuments(
                this.databaseId,
                this.adminsCollectionId,
                [Query.equal('colleges', tenantDocId), Query.limit(500)],
            );
            for (const userDoc of byRelation.documents) {
                if ((userDoc as any).$id) userIds.add((userDoc as any).$id);
            }
            if (userIds.size > 0) return userIds;
        } catch {
            // Fallback to full scan below.
        }

        try {
            const allUsers = await databases.listDocuments(
                this.databaseId,
                this.adminsCollectionId,
                [Query.limit(500)],
            );
            for (const userDoc of allUsers.documents) {
                const colleges = this.extractRelationshipIds((userDoc as any).colleges);
                if (colleges.includes(tenantDocId) && (userDoc as any).$id) {
                    userIds.add((userDoc as any).$id);
                }
            }
        } catch {
            // Ignore and return what we found.
        }

        return userIds;
    }

    private departmentBelongsToTenant(department: any, tenantAliases: Set<string>, tenantUserIds: Set<string>): boolean {
        if (department?.tenantId && tenantAliases.has(String(department.tenantId))) return true;

        const linkedColleges = this.extractRelationshipIds(department?.colleges);
        if (linkedColleges.some((id) => tenantAliases.has(id))) return true;

        if (tenantUserIds.size > 0) {
            const linkedUsers = this.extractRelationshipIds(department?.users);
            if (linkedUsers.some((id) => tenantUserIds.has(id))) return true;
        }

        return false;
    }

    async create(data: CreateTenantInput) {
        // Check collegeId uniqueness
        const existing = await databases.listDocuments(this.databaseId, this.collectionId, [
            Query.equal('collegeId', data.collegeId),
            Query.limit(1),
        ]);

        if (existing.total > 0) {
            throw new ConflictError(`College ID '${data.collegeId}' is already taken`);
        }

        // Separate admins from college data
        const { admins, ...collegeData } = data;

        // Build the document payload — only college fields (no admin data here)
        const docPayload: Record<string, unknown> = {
            collegeId: collegeData.collegeId,
            tag: String(collegeData.tag || '').trim().toLowerCase(),
            collegeName: collegeData.collegeName,
            address: collegeData.address,
            city: collegeData.city,
            state: collegeData.state,
            pincode: collegeData.pincode,
            phone: collegeData.phone,
            email: collegeData.email,
            website: collegeData.website,
            establishedYear: collegeData.establishedYear,
        };

        // Create the college document first
        const tenant = await databases.createDocument(
            this.databaseId,
            this.collectionId,
            ID.unique(),
            docPayload
        );

        // Create a Team for this college (admin data lives here, not in the college doc)
        const team = await appwriteTeams.create(
            ID.unique(),
            `${collegeData.collegeName} (${collegeData.collegeId})`
        );

        // Process admins: create auth users + add to college team
        const createdAdmins: Array<{ $id: string; name: string; email: string; role: string }> = [];
        if (admins && admins.length > 0) {
            for (const admin of admins) {
                try {
                    // Create the Auth user
                    const newUser = await appwriteUsers.create(
                        ID.unique(),
                        admin.email,
                        undefined,
                        admin.password,
                        admin.name,
                    );

                    // Set label based on selected role (maps to Appwrite label for auth)
                    const labelMap: Record<string, string> = {
                        tpo: 'TPO',
                        admin: 'TPOAssistant',      // 'admin' role created via this form = tpo_assistant
                        tpo_assistant: 'TPOAssistant',
                    };
                    const label = labelMap[admin.role] || 'TPO';
                    await appwriteUsers.updateLabels(newUser.$id, [label]);

                    // Add user as a member of the college team with their role
                    await appwriteTeams.createMembership(
                        team.$id,
                        [admin.role],     // roles inside the team
                        admin.email,      // email
                        newUser.$id,      // userId
                        undefined,        // phone
                        undefined,        // url
                        admin.name,       // name
                    );

                    // Many-to-one relationship: colleges field expects a single document ID string.
                    const adminDocPayloads: Array<Record<string, unknown>> = [
                        { name: admin.name, email: admin.email, colleges: tenant.$id, tenantId: tenant.$id },
                        { name: admin.name, email: admin.email, colleges: tenant.$id },
                        { name: admin.name, email: admin.email, tenantId: tenant.$id },
                        { name: admin.name, email: admin.email },
                    ];
                    let adminDocCreated = false;
                    for (const payload of adminDocPayloads) {
                        try {
                            await databases.createDocument(
                                this.databaseId,
                                this.adminsCollectionId,
                                ID.unique(),
                                payload,
                            );
                            adminDocCreated = true;
                            break;
                        } catch (docError) {
                            // Try next payload variant
                            continue;
                        }
                    }
                    if (!adminDocCreated) {
                        console.error(`[TenantService] All payload variants failed for admin doc ${admin.email}`);
                    }

                    createdAdmins.push({
                        $id: newUser.$id,
                        name: admin.name,
                        email: admin.email,
                        role: admin.role,
                    });
                } catch (error: unknown) {
                    console.error(`Failed to create admin ${admin.email}:`, error);
                }
            }
        }

        return { ...tenant, teamId: team.$id, createdAdmins };
    }

    async getById(tenantId: string) {
        try {
            return await databases.getDocument(this.databaseId, this.collectionId, tenantId);
        } catch (error) {
            this.rethrowIfConnectivityError(error);
            // Fallback: some older tokens/schemas store `collegeId` instead of tenant document ID.
        }

        try {
            const byCollegeId = await databases.listDocuments(this.databaseId, this.collectionId, [
                Query.equal('collegeId', tenantId),
                Query.limit(1),
            ]);
            if (byCollegeId.total > 0) return byCollegeId.documents[0];
        } catch (error) {
            this.rethrowIfConnectivityError(error);
            // Ignore and keep falling back.
        }

        try {
            const byTag = await databases.listDocuments(this.databaseId, this.collectionId, [
                Query.equal('tag', tenantId.trim().toLowerCase()),
                Query.limit(1),
            ]);
            if (byTag.total > 0) return byTag.documents[0];
        } catch (error) {
            this.rethrowIfConnectivityError(error);
            // Ignore and throw not found below.
        }

        throw new NotFoundError('Tenant');
    }

    async list(page: number, limit: number) {
        const queries = [
            Query.limit(limit),
            Query.offset((page - 1) * limit),
            Query.orderDesc('$createdAt'),
        ];

        const result = await databases.listDocuments(this.databaseId, this.collectionId, queries);

        return {
            tenants: result.documents,
            total: result.total,
        };
    }

    async update(tenantId: string, data: UpdateTenantInput) {
        const tenant = await this.getById(tenantId); // Verify exists + resolve canonical doc id
        const tenantDocId = (tenant as any).$id || tenantId;

        const updateData: Record<string, unknown> = {};
        if (data.collegeName !== undefined) updateData.collegeName = data.collegeName;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.city !== undefined) updateData.city = data.city;
        if (data.state !== undefined) updateData.state = data.state;
        if (data.pincode !== undefined) updateData.pincode = data.pincode;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.website !== undefined) updateData.website = data.website;
        if (data.establishedYear !== undefined) updateData.establishedYear = data.establishedYear;

        return await databases.updateDocument(this.databaseId, this.collectionId, tenantDocId, updateData);
    }

    /** Find team for a college and return its members */
    async getTeamMembers(tenantId: string) {
        const tenant = await this.getById(tenantId);
        const teamId = await this.findTenantTeamId(tenant);
        if (!teamId) {
            return { teamId: null, members: [] };
        }

        const memberships = await appwriteTeams.listMemberships(teamId, [Query.limit(100)]);

        const members = memberships.memberships.map((m) => ({
            $id: m.$id,
            userId: m.userId,
            userName: m.userName,
            userEmail: m.userEmail,
            roles: m.roles,
            joined: m.$createdAt,
        }));

        return { teamId, members };
    }

    async listDepartments(tenantRef: string) {
        const tenant = await this.getById(tenantRef);
        const tenantDocId = String((tenant as any).$id || tenantRef);
        const tenantAliases = this.buildTenantAliases(tenant);
        const tenantAliasCandidates = [...tenantAliases];
        const queriesBase = [Query.limit(500), Query.orderDesc('$createdAt')];
        let departments: any[] = [];

        for (const candidate of tenantAliasCandidates) {
            try {
                const byTenant = await databases.listDocuments(
                    this.databaseId,
                    this.departmentsCollectionId,
                    [Query.equal('tenantId', candidate), ...queriesBase],
                );
                if (byTenant.total > 0) {
                    departments = byTenant.documents;
                    break;
                }
            } catch {
                // Fallback below.
            }
        }

        if (departments.length === 0) {
            try {
                const byCollege = await databases.listDocuments(
                    this.databaseId,
                    this.departmentsCollectionId,
                    [Query.equal('colleges', tenantDocId), ...queriesBase],
                );
                if (byCollege.total > 0) {
                    departments = byCollege.documents;
                }
            } catch {
                // Fallback below.
            }
        }

        if (departments.length === 0) {
            try {
                const allDepartments = await databases.listDocuments(
                    this.databaseId,
                    this.departmentsCollectionId,
                    queriesBase,
                );
                const tenantUserIds = await this.listTenantUserDocIds(tenantDocId);
                departments = allDepartments.documents.filter((doc) =>
                    this.departmentBelongsToTenant(doc, tenantAliases, tenantUserIds),
                );
            } catch {
                departments = [];
            }
        }

        const deduped = new Map<string, any>();
        for (const department of departments) {
            deduped.set((department as any).$id || JSON.stringify(department), department);
        }

        return [...deduped.values()].sort((a, b) =>
            String((a as any).departmentName || '').localeCompare(String((b as any).departmentName || '')),
        );
    }

    async createDepartment(tenantRef: string, rawDepartmentName: string, options: CreateDepartmentOptions = {}) {
        const tenant = await this.getById(tenantRef);
        const tenantDocId = String((tenant as any).$id || tenantRef);
        const departmentName = this.normalizeDepartmentName(rawDepartmentName);
        const currentUserEmail = options.currentUserEmail;
        const departmentHeadName = options.departmentHeadName?.trim();
        const departmentHeadEmail = options.departmentHeadEmail?.trim();
        const departmentHeadPassword = options.departmentHeadPassword;

        if (!departmentName) {
            throw new ValidationError('Department name is required');
        }

        const hasHeadName = Boolean(departmentHeadName);
        const hasHeadEmail = Boolean(departmentHeadEmail);
        const hasHeadPassword = Boolean(departmentHeadPassword && departmentHeadPassword.trim().length > 0);
        const providedHeadFields = [hasHeadName, hasHeadEmail, hasHeadPassword].filter(Boolean).length;
        if (providedHeadFields > 0 && providedHeadFields < 3) {
            throw new ValidationError('Department head name, email, and password are required');
        }

        const [existing, tenantUserIds] = await Promise.all([
            this.listDepartments(tenantDocId),
            this.listTenantUserDocIds(tenantDocId),
        ]);
        const exists = existing.some((department: any) =>
            String(department.departmentName || '').trim().toLowerCase() === departmentName.toLowerCase(),
        );
        if (exists) {
            throw new ConflictError(`Department '${departmentName}' already exists`);
        }

        let departmentHeadContext: DepartmentHeadContext | undefined;
        if (hasHeadName && hasHeadEmail && hasHeadPassword) {
            departmentHeadContext = await this.createDepartmentHead(
                tenant,
                tenantDocId,
                departmentName,
                departmentHeadName as string,
                departmentHeadEmail as string,
                departmentHeadPassword as string,
            );
        }
        let creatorUserDocId: string | undefined;

        if (currentUserEmail) {
            try {
                const userLookup = await databases.listDocuments(
                    this.databaseId,
                    this.adminsCollectionId,
                    [Query.equal('email', currentUserEmail), Query.limit(1)],
                );
                if (userLookup.total > 0) {
                    const userDoc = userLookup.documents[0] as any;
                    const linkedColleges = this.extractRelationshipIds(userDoc.colleges);
                    if (linkedColleges.includes(tenantDocId)) {
                        creatorUserDocId = userDoc.$id;
                    }
                }
            } catch {
                // Ignore and fallback to the first tenant user.
            }
        }

        if (!creatorUserDocId && tenantUserIds.size > 0) {
            creatorUserDocId = [...tenantUserIds][0];
        }

        const departmentUserDocId = departmentHeadContext?.userDocId || creatorUserDocId;
        if (departmentHeadContext && !departmentHeadContext.userDocId) {
            await this.rollbackDepartmentHead(departmentHeadContext);
            throw new ValidationError('Department head user record could not be linked to department');
        }

        const payloadCandidatesWithUser: Array<Record<string, unknown>> = departmentUserDocId
            ? [
                // `users` is now a one-to-one relationship, so always send a single document ID.
                { departmentName, tenantId: tenantDocId, colleges: [tenantDocId], users: departmentUserDocId },
                { departmentName, tenantId: tenantDocId, users: departmentUserDocId },
                { departmentName, colleges: [tenantDocId], users: departmentUserDocId },
                { departmentName, users: departmentUserDocId },
                { departmentName, tenantId: tenantDocId, colleges: tenantDocId, users: departmentUserDocId },
                { departmentName, colleges: tenantDocId, users: departmentUserDocId },
            ]
            : [];

        const payloadCandidatesWithoutUser: Array<Record<string, unknown>> = [
            // Array variants
            { departmentName, tenantId: tenantDocId, colleges: [tenantDocId] },
            { departmentName, tenantId: tenantDocId },
            { departmentName, colleges: [tenantDocId] },
            // String variants
            { departmentName, tenantId: tenantDocId, colleges: tenantDocId },
            { departmentName, colleges: tenantDocId },
            { departmentName },
        ];

        const payloadCandidates = (
            departmentHeadContext
                ? payloadCandidatesWithUser
                : [...payloadCandidatesWithoutUser, ...payloadCandidatesWithUser]
        ).map((payload) => Object.fromEntries(
            Object.entries(payload).filter(([, value]) => value !== undefined),
        ));

        let lastError: unknown;
        for (const payload of payloadCandidates) {
            try {
                return await databases.createDocument(
                    this.databaseId,
                    this.departmentsCollectionId,
                    ID.unique(),
                    payload,
                );
            } catch (error) {
                const shouldRetry =
                    this.isUnknownAttributeError(error, 'tenantId')
                    || this.isUnknownAttributeError(error, 'colleges')
                    || this.isUnknownAttributeError(error, 'users')
                    || this.isRelationshipValueError(error);
                if (shouldRetry) {
                    lastError = error;
                    continue;
                }
                await this.rollbackDepartmentHead(departmentHeadContext);
                throw error;
            }
        }

        await this.rollbackDepartmentHead(departmentHeadContext);
        throw (lastError as Error) || new ValidationError('Unable to create department');
    }

    async deleteDepartment(tenantRef: string, departmentId: string) {
        const tenant = await this.getById(tenantRef);
        const tenantDocId = String((tenant as any).$id || tenantRef);
        const tenantAliases = this.buildTenantAliases(tenant);
        const tenantUserIds = await this.listTenantUserDocIds(tenantDocId);

        let department: any;
        try {
            department = await databases.getDocument(this.databaseId, this.departmentsCollectionId, departmentId);
        } catch {
            throw new NotFoundError('Department');
        }

        if (!this.departmentBelongsToTenant(department, tenantAliases, tenantUserIds)) {
            throw new NotFoundError('Department');
        }

        await databases.deleteDocument(this.databaseId, this.departmentsCollectionId, departmentId);
        return { message: 'Department deleted successfully' };
    }

    async listStudents(tenantRef: string, page: number, limit: number, filters: { department?: string } = {}) {
        const tenant = await this.getById(tenantRef);
        const tenantDocId = String((tenant as any).$id || tenantRef);

        const result = await studentService.list(tenantDocId, page, limit, filters);
        return {
            students: (result.students || []).map((student: any) => this.sanitizeStudentDoc(student)),
            total: result.total,
        };
    }
}

export const tenantService = new TenantService();
