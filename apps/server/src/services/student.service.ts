import { databases, users as appwriteUsers, teams as appwriteTeams } from '../config/appwrite';
import { env } from '../config/env';
import { ID, Query } from 'node-appwrite';
import { NotFoundError } from '../utils/errors';
import { CreateStudentInput, UpdateStudentInput } from '@careernest/shared';

export class StudentService {
    private readonly databaseId = env.APPWRITE_DATABASE_ID;
    private readonly collectionId = env.COLLECTION_STUDENTS;

    /**
     * Find or create a single global "Students" team.
     * All student users across all colleges are members of this one team.
     * College association is determined from the database (colleges relationship).
     */
    private async findOrCreateStudentsTeam(): Promise<string> {
        const teamName = 'Students';
        const teamsList = await appwriteTeams.list([], teamName);
        const existing = teamsList.teams.find((t) => t.name === teamName);
        if (existing) return existing.$id;

        const team = await appwriteTeams.create(ID.unique(), teamName);
        return team.$id;
    }

    async create(tenantId: string, data: CreateStudentInput) {
        // 1. Create Appwrite auth user
        const newUser = await appwriteUsers.create(
            ID.unique(),
            data.email,
            undefined,            // phone
            data.password,
            data.name,
        );

        // 2. Set "Student" label on the user
        await appwriteUsers.updateLabels(newUser.$id, ['Student']);

        // 3. Add to global Students team
        const teamId = await this.findOrCreateStudentsTeam();
        await appwriteTeams.createMembership(
            teamId,
            ['student'],
            data.email,
            newUser.$id,
            undefined,
            undefined,
            data.name,
        );

        // 4. Create student document in database
        const student = await databases.createDocument(
            this.databaseId,
            this.collectionId,
            ID.unique(),
            {
                userid: newUser.$id,
                name: data.name,
                email: data.email,
                department: data.department,
                enrollmentYear: data.enrollmentYear,
                phoneNumber: data.phoneNumber,
                address: data.address,
                tenantId: tenantId,
                colleges: [tenantId],
            }
        );

        return { ...student, authUserId: newUser.$id, teamId };
    }

    async bulkCreate(tenantId: string, students: CreateStudentInput[]) {
        const results: { success: any[]; failed: { email: string; error: string }[] } = {
            success: [],
            failed: [],
        };

        // Get team ID once for all students
        const teamId = await this.findOrCreateStudentsTeam();

        for (const data of students) {
            try {
                // 1. Create auth user
                const newUser = await appwriteUsers.create(
                    ID.unique(),
                    data.email,
                    undefined,
                    data.password,
                    data.name,
                );

                // 2. Set label
                await appwriteUsers.updateLabels(newUser.$id, ['Student']);

                // 3. Add to team
                await appwriteTeams.createMembership(
                    teamId,
                    ['student'],
                    data.email,
                    newUser.$id,
                    undefined,
                    undefined,
                    data.name,
                );

                // 4. Create document
                const student = await databases.createDocument(
                    this.databaseId,
                    this.collectionId,
                    ID.unique(),
                    {
                        userid: newUser.$id,
                        name: data.name,
                        email: data.email,
                        department: data.department,
                        enrollmentYear: data.enrollmentYear,
                        phoneNumber: data.phoneNumber,
                        address: data.address,
                        tenantId: tenantId,
                        colleges: [tenantId],
                    }
                );

                results.success.push(student);
            } catch (err: any) {
                results.failed.push({
                    email: data.email,
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
    private belongsToTenant(doc: any, tenantId: string): boolean {
        // Check plain tenantId field first
        if (doc.tenantId && doc.tenantId === tenantId) return true;
        // Check colleges relationship
        const colleges = doc.colleges;
        if (Array.isArray(colleges)) {
            return colleges.some((c: any) => (c.$id || c) === tenantId);
        }
        if (colleges) {
            return (colleges.$id || colleges) === tenantId;
        }
        return false;
    }

    /**
     * Find a student by auth user ID or email.
     * Primary lookup is by email (always reliable).
     * Falls back to 'userid' field query.
     * Tenant membership is verified via the colleges relationship.
     */
    async getByUserId(userId: string, tenantId?: string, email?: string) {
        let doc: any = null;

        // 1. Try by email first (most reliable — userid field may not match auth user ID)
        if (email) {
            try {
                const docs = await databases.listDocuments(this.databaseId, this.collectionId, [
                    Query.equal('email', email),
                    Query.limit(1),
                ]);
                if (docs.total > 0) doc = docs.documents[0];
            } catch { /* attribute might not exist */ }
        }

        // 2. Fallback: try by 'userid' field
        if (!doc) {
            try {
                const docs = await databases.listDocuments(this.databaseId, this.collectionId, [
                    Query.equal('userid', userId),
                    Query.limit(1),
                ]);
                if (docs.total > 0) doc = docs.documents[0];
            } catch { /* attribute might not exist */ }
        }

        if (!doc) throw new NotFoundError('Student profile');

        // 3. Verify tenant membership via colleges relationship if tenantId given
        if (tenantId && !this.belongsToTenant(doc, tenantId)) {
            throw new NotFoundError('Student profile');
        }

        return doc;
    }

    async getById(studentDocId: string, tenantId?: string) {
        try {
            const student = await databases.getDocument(this.databaseId, this.collectionId, studentDocId);

            if (tenantId && !this.belongsToTenant(student as any, tenantId)) {
                throw new NotFoundError('Student');
            }

            return student;
        } catch {
            throw new NotFoundError('Student');
        }
    }

    async list(tenantId: string, page: number, limit: number, filters: { department?: string } = {}) {
        // Try querying by tenantId field directly (faster)
        let students: any[] = [];
        let total = 0;

        try {
            const queries = [
                Query.equal('tenantId', tenantId),
                Query.limit(limit),
                Query.offset((page - 1) * limit),
                Query.orderDesc('$createdAt'),
            ];
            if (filters.department) {
                queries.push(Query.equal('department', filters.department));
            }
            const result = await databases.listDocuments(this.databaseId, this.collectionId, queries);
            students = result.documents;
            total = result.total;
        } catch {
            // tenantId attribute might not exist — fall back to fetching all + filtering
            const queries = [
                Query.limit(500),
                Query.orderDesc('$createdAt'),
            ];
            if (filters.department) {
                queries.push(Query.equal('department', filters.department));
            }
            const result = await databases.listDocuments(this.databaseId, this.collectionId, queries);
            students = result.documents.filter((doc: any) => this.belongsToTenant(doc, tenantId));
            total = students.length;
            const start = (page - 1) * limit;
            students = students.slice(start, start + limit);
        }

        return { students, total };
    }

    async update(studentDocId: string, tenantId: string, data: UpdateStudentInput) {
        await this.getById(studentDocId, tenantId);

        const updateData: Record<string, unknown> = {};
        if (data.department !== undefined) updateData.department = data.department;
        if (data.enrollmentYear !== undefined) updateData.enrollmentYear = data.enrollmentYear;
        if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
        if (data.address !== undefined) updateData.address = data.address;

        return await databases.updateDocument(this.databaseId, this.collectionId, studentDocId, updateData);
    }
}

export const studentService = new StudentService();
