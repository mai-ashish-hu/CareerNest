import { databases } from '../config/appwrite';
import { env } from '../config/env';
import { Query } from 'node-appwrite';
import { NotFoundError, ValidationError, ServiceUnavailableError } from '../utils/errors';
import { CreateStudentInput, UpdateStudentInput } from '@careernest/shared';

export class StudentService {
    private readonly databaseId = env.APPWRITE_DATABASE_ID;
    private readonly collectionId = env.COLLECTION_STUDENTS;
    private tenantIdFieldSupported: boolean | null = null;
    private readonly tenantContextCache = new Map<string, { tenantDocId: string; tag: string; collegeId?: string }>();

    private async resolveTenantContext(tenantRef: string): Promise<{ tenantDocId: string; tag: string; collegeId?: string }> {
        const cached = this.tenantContextCache.get(tenantRef);
        if (cached) return cached;

        const trimmedRef = tenantRef.trim();
        let tenant: any | null = null;

        try {
            tenant = await databases.getDocument(this.databaseId, env.COLLECTION_TENANTS, trimmedRef);
        } catch (error) {
            this.rethrowIfConnectivityError(error);
            tenant = null;
        }

        if (!tenant) {
            try {
                const byCollegeId = await databases.listDocuments(this.databaseId, env.COLLECTION_TENANTS, [
                    Query.equal('collegeId', trimmedRef),
                    Query.limit(1),
                ]);
                if (byCollegeId.total > 0) tenant = byCollegeId.documents[0];
            } catch (error) {
                this.rethrowIfConnectivityError(error);
                tenant = null;
            }
        }

        if (!tenant) {
            try {
                const byTag = await databases.listDocuments(this.databaseId, env.COLLECTION_TENANTS, [
                    Query.equal('tag', trimmedRef.toLowerCase()),
                    Query.limit(1),
                ]);
                if (byTag.total > 0) tenant = byTag.documents[0];
            } catch (error) {
                this.rethrowIfConnectivityError(error);
                tenant = null;
            }
        }

        if (!tenant) {
            throw new NotFoundError('Tenant');
        }

        const tag = String((tenant as any).tag || '').trim().toLowerCase();
        if (!tag) {
            throw new ValidationError('College tag is not configured. Please set the `tag` field in the college document.');
        }

        const context = {
            tenantDocId: String((tenant as any).$id || ''),
            tag,
            collegeId: typeof (tenant as any).collegeId === 'string' ? (tenant as any).collegeId : undefined,
        };

        if (!context.tenantDocId) {
            throw new NotFoundError('Tenant');
        }

        this.tenantContextCache.set(context.tenantDocId, context);
        this.tenantContextCache.set(trimmedRef, context);
        if (context.collegeId) {
            this.tenantContextCache.set(context.collegeId, context);
        }

        return context;
    }

    private buildTenantIdAliases(tenantRef: string, context?: { tenantDocId: string; collegeId?: string }): Set<string> {
        const aliases = new Set<string>();
        const trimmedRef = tenantRef.trim();
        if (trimmedRef) aliases.add(trimmedRef);
        if (context?.tenantDocId) aliases.add(context.tenantDocId);
        if (context?.collegeId) aliases.add(context.collegeId);
        return aliases;
    }

    private buildQualifiedStudentId(rawStudentId: string): string {
        const trimmed = rawStudentId.trim();
        if (!trimmed) {
            throw new ValidationError('Student ID is required');
        }
        return trimmed;
    }

    private isUnknownAttribute(error: any, attr: string): boolean {
        const message = error?.response?.message || error?.message || '';
        return typeof message === 'string' && message.includes(`Unknown attribute: "${attr}"`);
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

    private departementsFieldSupported: boolean | null = null;

    private async createStudentDocument(
        studentId: string,
        tenantDocId: string,
        tag: string,
        data: Omit<CreateStudentInput, 'studentId'>
    ) {
        const basePayload: Record<string, unknown> = {
            password: data.password,
            name: data.name,
            email: data.email,
            enrollmentYear: data.enrollmentYear,
            phoneNumber: data.phoneNumber,
            address: data.address,
            colleges: tenantDocId,
        };

        // Add departements relationship if supported
        if (this.departementsFieldSupported !== false && data.department) {
            basePayload.departements = data.department;
        }

        // If we've already learned tenantId field doesn't exist, skip it.
        if (this.tenantIdFieldSupported === false) {
            return this.createDocWithFallback(studentId, basePayload);
        }

        const payloadWithTenantId: Record<string, unknown> = {
            ...basePayload,
            tenantId: tenantDocId,
        };

        try {
            const doc = await this.createDocWithFallback(studentId, payloadWithTenantId);
            this.tenantIdFieldSupported = true;
            return doc;
        } catch (error) {
            if (this.tenantIdFieldSupported !== true && this.isUnknownAttribute(error, 'tenantId')) {
                this.tenantIdFieldSupported = false;
                return this.createDocWithFallback(studentId, basePayload);
            }
            throw error;
        }
    }

    private async createDocWithFallback(studentId: string, payload: Record<string, unknown>) {
        try {
            const doc = await databases.createDocument(this.databaseId, this.collectionId, studentId, payload);
            if (payload.departements !== undefined) this.departementsFieldSupported = true;
            return doc;
        } catch (error) {
            if (this.departementsFieldSupported !== true && this.isUnknownAttribute(error, 'departements')) {
                this.departementsFieldSupported = false;
                console.warn('[StudentService] "departements" relationship not found in students collection.');
                const { departements, ...rest } = payload;
                return databases.createDocument(this.databaseId, this.collectionId, studentId, rest);
            }
            throw error;
        }
    }

    async create(tenantId: string, data: CreateStudentInput) {
        const tenantContext = await this.resolveTenantContext(tenantId);
        const studentId = this.buildQualifiedStudentId(data.studentId);

        const student = await this.createStudentDocument(
            studentId,
            tenantContext.tenantDocId,
            tenantContext.tag,
            {
                password: data.password,
                name: data.name,
                email: data.email,
                department: data.department,
                enrollmentYear: data.enrollmentYear,
                phoneNumber: data.phoneNumber,
                address: data.address,
            }
        );

        return student;
    }

    async bulkCreate(tenantId: string, students: CreateStudentInput[]) {
        const tenantContext = await this.resolveTenantContext(tenantId);
        const results: { success: any[]; failed: { email: string; error: string }[] } = {
            success: [],
            failed: [],
        };

        for (const data of students) {
            try {
                const studentId = this.buildQualifiedStudentId(data.studentId);

                const student = await this.createStudentDocument(
                    studentId,
                    tenantContext.tenantDocId,
                    tenantContext.tag,
                    {
                        password: data.password,
                        name: data.name,
                        email: data.email,
                        department: data.department,
                        enrollmentYear: data.enrollmentYear,
                        phoneNumber: data.phoneNumber,
                        address: data.address,
                    }
                );

                results.success.push(student);
            } catch (err: any) {
                results.failed.push({
                    email: data.email || data.studentId.trim(),
                    error: err?.message || 'Unknown error',
                });
            }
        }

        return results;
    }

    /**
     * Check whether a student document belongs to a given tenant.
     * Handles both `tenantId` (string field) and `colleges` (relationship) schemas.
     */
    private belongsToTenant(doc: any, tenantIds: Set<string>): boolean {
        // Check plain tenantId field first
        if (doc.tenantId && tenantIds.has(doc.tenantId)) return true;
        // Check colleges relationship
        const colleges = doc.colleges;
        if (Array.isArray(colleges)) {
            return colleges.some((c: any) => tenantIds.has(c.$id || c));
        }
        if (colleges) {
            return tenantIds.has(colleges.$id || colleges);
        }
        return false;
    }

    /**
     * Find a student by student document ID (preferred), then fallback to email.
     */
    async getByUserId(userId: string, tenantId?: string | null, email?: string) {
        let doc: any = null;

        // 1. Prefer document lookup by ID (new flow: userId === studentId === doc ID)
        try {
            doc = await databases.getDocument(this.databaseId, this.collectionId, userId);
        } catch (err: any) {
            // Only swallow 404 (document not found); re-throw connectivity / timeout errors
            if (err?.code === 404 || err?.type === 'document_not_found') {
                doc = null;
            } else {
                throw err;
            }
        }

        // 2. Fallback by email
        if (!doc && email) {
            try {
                const docs = await databases.listDocuments(this.databaseId, this.collectionId, [
                    Query.equal('email', email),
                    Query.limit(1),
                ]);
                if (docs.total > 0) doc = docs.documents[0];
            } catch (err: any) {
                // Only swallow attribute-missing errors (400); re-throw connectivity errors
                if (err?.code === 400) {
                    /* attribute might not exist */
                } else {
                    throw err;
                }
            }
        }

        if (!doc) throw new NotFoundError('Student profile');

        // 3. Verify tenant membership via colleges relationship if tenantId given
        if (tenantId) {
            const tenantContext = await this.resolveTenantContext(tenantId).catch(() => undefined);
            const tenantIds = this.buildTenantIdAliases(tenantId, tenantContext);
            if (!this.belongsToTenant(doc, tenantIds)) {
                throw new NotFoundError('Student profile');
            }
        }

        return doc;
    }

    async getById(studentDocId: string, tenantId?: string | null) {
        try {
            const student = await databases.getDocument(this.databaseId, this.collectionId, studentDocId);

            if (tenantId) {
                const tenantContext = await this.resolveTenantContext(tenantId).catch(() => undefined);
                const tenantIds = this.buildTenantIdAliases(tenantId, tenantContext);
                if (!this.belongsToTenant(student as any, tenantIds)) {
                    throw new NotFoundError('Student');
                }
            }

            return student;
        } catch {
            throw new NotFoundError('Student');
        }
    }

    private getStudentDeptId(doc: any): string {
        const dept = doc.department;
        if (Array.isArray(dept) && dept.length > 0) {
            const first = dept[0];
            return typeof first === 'object' ? (first.$id || '') : String(first);
        }
        if (typeof dept === 'object' && dept !== null) return dept.$id || '';
        return typeof dept === 'string' ? dept : '';
    }

    async list(tenantId: string, page: number, limit: number, filters: { department?: string } = {}) {
        let students: any[] = [];
        let total = 0;
        const tenantContext = await this.resolveTenantContext(tenantId).catch(() => undefined);
        const tenantIds = this.buildTenantIdAliases(tenantId, tenantContext);
        const tenantIdCandidates = [...tenantIds];
        let tenantIdQueryError = false;

        try {
            for (const candidate of tenantIdCandidates) {
                const queries = [
                    Query.equal('tenantId', candidate),
                    Query.limit(500),
                    Query.orderDesc('$createdAt'),
                ];
                const result = await databases.listDocuments(this.databaseId, this.collectionId, queries);
                if (result.total > 0) {
                    students = result.documents;
                    total = result.total;
                    break;
                }
            }
        } catch {
            tenantIdQueryError = true;
        }

        if (total === 0 || tenantIdQueryError) {
            const queries = [
                Query.limit(500),
                Query.orderDesc('$createdAt'),
            ];
            const result = await databases.listDocuments(this.databaseId, this.collectionId, queries);
            students = result.documents.filter((doc: any) => this.belongsToTenant(doc, tenantIds));
            total = students.length;
        }

        // Filter by department client-side (department is a relationship)
        if (filters.department) {
            students = students.filter((doc: any) => this.getStudentDeptId(doc) === filters.department);
            total = students.length;
        }

        const start = (page - 1) * limit;
        students = students.slice(start, start + limit);

        return { students, total };
    }

    
    /**
     * Fetch students by a known list of document IDs.
     * This is primarily used by searchDirectory to avoid listing the
     * entire tenant collection when only a few matches exist.
     */
    async listByIds(
        tenantId: string,
        page: number,
        limit: number,
        ids: string[]
    ) {
        if (ids.length === 0) {
            return { students: [], total: 0 };
        }

        const tenantContext = await this.resolveTenantContext(tenantId).catch(() => undefined);
        const tenantIds = this.buildTenantIdAliases(tenantId, tenantContext);

        // fetch documents individually and filter by tenant to be safe
        const docs: any[] = [];
        for (const id of ids) {
            try {
                const doc = await databases.getDocument(this.databaseId, this.collectionId, id);
                if (this.belongsToTenant(doc, tenantIds)) {
                    docs.push(doc);
                }
            } catch {
                // ignore missing
            }
        }

        const total = docs.length;
        const start = (page - 1) * limit;
        const students = docs.slice(start, start + limit);
        return { students, total };
    }

    async update(studentDocId: string, tenantId: string, data: UpdateStudentInput) {
        await this.getById(studentDocId, tenantId);

        const updateData: Record<string, unknown> = {};
        if (data.department !== undefined) updateData.department = [data.department];
        if (data.enrollmentYear !== undefined) updateData.enrollmentYear = data.enrollmentYear;
        if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
        if (data.address !== undefined) updateData.address = data.address;

        return await databases.updateDocument(this.databaseId, this.collectionId, studentDocId, updateData);
    }
}

export const studentService = new StudentService();
