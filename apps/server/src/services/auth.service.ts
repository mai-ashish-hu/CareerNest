import { Client, Account, Query } from 'node-appwrite';
import { users as appwriteUsers, databases } from '../config/appwrite';
import { env } from '../config/env';
import jwt from 'jsonwebtoken';
import { AuthenticationError, ForbiddenError } from '../utils/errors';
import { mapLabelsToRole } from '../utils/label-role';

export class AuthService {
    /**
     * Login: Validate credentials via Appwrite, check labels, issue JWT.
     */
    async login(email: string, password: string) {
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
        try {
            if (role === 'student') {
                // Students: find by email (most reliable), fallback to userid
                let studentDoc: any = null;

                try {
                    const docs = await databases.listDocuments(
                        env.APPWRITE_DATABASE_ID,
                        env.COLLECTION_STUDENTS,
                        [Query.equal('email', appwriteUser.email), Query.limit(1)]
                    );
                    if (docs.total > 0) studentDoc = docs.documents[0];
                } catch { /* attribute might not exist */ }

                if (!studentDoc) {
                    try {
                        const docs = await databases.listDocuments(
                            env.APPWRITE_DATABASE_ID,
                            env.COLLECTION_STUDENTS,
                            [Query.equal('userid', appwriteUser.$id), Query.limit(1)]
                        );
                        if (docs.total > 0) studentDoc = docs.documents[0];
                    } catch { /* attribute might not exist */ }
                }

                if (studentDoc) {
                    // Extract tenantId from colleges relationship
                    tenantId = this.extractTenantId(studentDoc.colleges);
                } else {
                    console.error(`[Auth] No student document found for email: ${appwriteUser.email}`);
                }
            } else {
                // TPO / Admin: look up in users/admins collection by email
                const userDocs = await databases.listDocuments(
                    env.APPWRITE_DATABASE_ID,
                    env.COLLECTION_ADMINS,
                    [Query.equal('email', appwriteUser.email), Query.limit(1)]
                );
                if (userDocs.total > 0) {
                    const userDoc = userDocs.documents[0];
                    tenantId = this.extractTenantId(userDoc.colleges) ?? userDoc.tenantId ?? null;
                }
            }
        } catch (error) {
            console.error('[Auth] Failed to lookup tenantId:', error);
        }

        // Create a JWT signed by our server
        const token = jwt.sign(
            { userId: appwriteUser.$id, email: appwriteUser.email, name: appwriteUser.name, role, tenantId },
            env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            token,
            user: {
                id: appwriteUser.$id,
                name: appwriteUser.name,
                email: appwriteUser.email,
                role,
                tenantId,
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
