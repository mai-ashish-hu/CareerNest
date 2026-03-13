import { Client, Account, Query } from 'node-appwrite';
import { users as appwriteUsers, databases } from '../config/appwrite';
import { env } from '../config/env';
import jwt from 'jsonwebtoken';
import { AuthenticationError, ForbiddenError } from '../utils/errors';
import { mapLabelsToRole } from '../utils/label-role';
import type { Role } from '@careernest/shared';

export class AuthService {
    private signToken(payload: { userId: string; email: string; name: string; role: Role; tenantId: string | null; companyId?: string | null; department?: string | null }) {
        return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });
    }

    private extractTagFromDefaultPassword(password: string): string | null {
        const normalized = password.trim().toLowerCase();
        if (!normalized.endsWith('@123')) return null;
        const tag = normalized.slice(0, -4).trim();
        return tag || null;
    }

    private async normalizeTenantId(tenantId: string | null): Promise<string | null> {
        if (!tenantId) return null;
        const trimmed = tenantId.trim();
        if (!trimmed) return null;

        try {
            const tenant = await databases.getDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_TENANTS,
                trimmed
            );
            return (tenant as any).$id || trimmed;
        } catch {
            // fall through
        }

        try {
            const byCollegeId = await databases.listDocuments(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_TENANTS,
                [Query.equal('collegeId', trimmed), Query.limit(1)]
            );
            if (byCollegeId.total > 0) {
                return (byCollegeId.documents[0] as any).$id || null;
            }
        } catch {
            // fall through
        }

        try {
            const byTag = await databases.listDocuments(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_TENANTS,
                [Query.equal('tag', trimmed.toLowerCase()), Query.limit(1)]
            );
            if (byTag.total > 0) {
                return (byTag.documents[0] as any).$id || null;
            }
        } catch {
            // fall through
        }

        return trimmed;
    }

    private async loginStudentViaTable(studentId: string, password: string) {
        const normalizedInput = studentId.trim();

        let studentDoc: any = null;
        try {
            studentDoc = await databases.getDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_STUDENTS,
                normalizedInput
            );
        } catch {
            studentDoc = null;
        }

        if (!studentDoc) {
            throw new AuthenticationError('Invalid student ID or password');
        }

        const storedPassword = studentDoc.password as string | undefined;

        if (storedPassword !== password) {
            throw new AuthenticationError('Invalid student ID or password');
        }

        const tenantRef = this.extractTenantId(studentDoc.colleges) ?? studentDoc.tenantId ?? null;
        const tenantId = await this.normalizeTenantId(tenantRef);

        const token = this.signToken({
            userId: studentDoc.$id,
            email: studentDoc.email || '',
            name: studentDoc.name || studentId,
            role: 'student',
            tenantId,
            companyId: null,
        });

        return {
            token,
            user: {
                id: studentDoc.$id,
                name: studentDoc.name || '',
                email: studentDoc.email || '',
                role: 'student',
                tenantId,
                companyId: null,
            },
        };
    }

    private async resolveStudentTenantId(email: string): Promise<string | null> {
        let studentDoc: any = null;

        try {
            const docs = await databases.listDocuments(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_STUDENTS,
                [Query.equal('email', email), Query.limit(1)]
            );
            if (docs.total > 0) studentDoc = docs.documents[0];
        } catch {
            // Attribute might not exist yet.
        }

        if (!studentDoc) {
            console.error(`[Auth] No student document found for email: ${email}`);
            return null;
        }

        const tenantRef = this.extractTenantId(studentDoc.colleges) ?? studentDoc.tenantId ?? null;
        return this.normalizeTenantId(tenantRef);
    }

    private async resolveCompanyContext(email: string): Promise<{ tenantId: string | null; companyId: string | null }> {
        try {
            const docs = await databases.listDocuments(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_COMPANIES,
                [Query.equal('contactEmail', email), Query.limit(1)]
            );

            if (docs.total === 0) {
                console.error(`[Auth] No company document found for email: ${email}`);
                return { tenantId: null, companyId: null };
            }

            const companyDoc = docs.documents[0];
            const tenantRef = this.extractTenantId(companyDoc.colleges) ?? companyDoc.tenantId ?? null;
            return {
                tenantId: await this.normalizeTenantId(tenantRef),
                companyId: companyDoc.$id,
            };
        } catch (error) {
            console.error('[Auth] Failed to lookup company context:', error);
            return { tenantId: null, companyId: null };
        }
    }

    private async resolveAdminTenantId(email: string): Promise<string | null> {
        const ctx = await this.resolveAdminContext(email);
        return ctx.tenantId;
    }

    private async resolveAdminContext(email: string): Promise<{ tenantId: string | null; department: string | null }> {
        const userDocs = await databases.listDocuments(
            env.APPWRITE_DATABASE_ID,
            env.COLLECTION_ADMINS,
            [Query.equal('email', email), Query.limit(1)]
        );

        if (userDocs.total === 0) {
            return { tenantId: null, department: null };
        }

        const userDoc = userDocs.documents[0];
        const tenantRef = this.extractTenantId(userDoc.colleges) ?? userDoc.tenantId ?? null;
        const tenantId = await this.normalizeTenantId(tenantRef);
        const department = (userDoc.department as string | undefined) ?? null;
        return { tenantId, department };
    }

    /**
     * Login: Validate credentials via Appwrite, check labels, issue JWT.
     */
    async login(email: string | undefined, password: string, studentId?: string) {
        if (studentId) {
            const normalizedStudentId = studentId.trim();
            if (!normalizedStudentId) {
                throw new AuthenticationError('Student ID is required');
            }
            return this.loginStudentViaTable(normalizedStudentId, password);
        }

        if (!email) {
            throw new AuthenticationError('Email is required');
        }

        // Create a client WITHOUT API key (acts like a client SDK to verify password)
        const tempClient = new Client()
            .setEndpoint(env.APPWRITE_ENDPOINT)
            .setProject(env.APPWRITE_PROJECT_ID);

        const tempAccount = new Account(tempClient);

        let session;
        try {
            session = await tempAccount.createEmailPasswordSession(email, password);
        } catch {
            throw new AuthenticationError('Invalid email or password');
        }

        // Get user labels via admin SDK
        const appwriteUser = await appwriteUsers.get(session.userId);
        const labels: string[] = appwriteUser.labels ?? [];
        const role = mapLabelsToRole(labels);

        if (!role) {
            throw new ForbiddenError('No role assigned to this account.');
        }

        // Look up tenantId from the appropriate collection based on role
        let tenantId: string | null = null;
        let companyId: string | null = null;
        let department: string | null = null;
        try {
            if (role === 'student') {
                tenantId = await this.resolveStudentTenantId(appwriteUser.email);
            } else if (role === 'company') {
                const companyContext = await this.resolveCompanyContext(appwriteUser.email);
                tenantId = companyContext.tenantId;
                companyId = companyContext.companyId;
            } else {
                const adminCtx = await this.resolveAdminContext(appwriteUser.email);
                tenantId = adminCtx.tenantId;
                department = adminCtx.department;
            }
        } catch (error) {
            console.error('[Auth] Failed to lookup tenantId:', error);
        }

        // Create a JWT signed by our server
        const token = this.signToken({
            userId: appwriteUser.$id,
            email: appwriteUser.email,
            name: appwriteUser.name,
            role,
            tenantId,
            companyId,
            department,
        });

        return {
            token,
            user: {
                id: appwriteUser.$id,
                name: appwriteUser.name,
                email: appwriteUser.email,
                role,
                tenantId,
                companyId,
                department,
            },
        };
    }

    /**
     * Extract tenantId from the colleges relationship field.
     * Handles: array of objects [{$id}], array of strings ["id"], single object {$id}, or string "id".
     */
    private extractTenantId(colleges: unknown): string | null {
        if (!colleges) return null;
        if (Array.isArray(colleges) && colleges.length > 0) {
            const first = colleges[0];
            return typeof first === 'string' ? first : (first?.$id ?? null);
        }
        if (typeof colleges === 'object' && colleges !== null) {
            return (colleges as any).$id ?? null;
        }
        if (typeof colleges === 'string') {
            return colleges;
        }
        return null;
    }

    /**
     * Get user by ID via admin SDK and derive role from labels.
     */
    async getUserById(userId: string) {
        try {
            const appwriteUser = await appwriteUsers.get(userId);
            const role = mapLabelsToRole(appwriteUser.labels ?? []);
            return {
                $id: appwriteUser.$id,
                name: appwriteUser.name,
                email: appwriteUser.email,
                role,
            };
        } catch {
            throw new AuthenticationError('User not found');
        }
    }
}

export const authService = new AuthService();
