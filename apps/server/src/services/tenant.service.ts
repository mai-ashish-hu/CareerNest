import { databases, users as appwriteUsers, teams as appwriteTeams } from '../config/appwrite';
import { env } from '../config/env';
import { ID, Query } from 'node-appwrite';
import { NotFoundError, ConflictError } from '../utils/errors';
import { CreateTenantInput, UpdateTenantInput } from '@careernest/shared';

export class TenantService {
    private readonly databaseId = env.APPWRITE_DATABASE_ID;
    private readonly collectionId = env.COLLECTION_TENANTS;
    private readonly adminsCollectionId = env.COLLECTION_ADMINS;

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

                    // Save admin in the admins collection with college relationship
                    await databases.createDocument(
                        this.databaseId,
                        this.adminsCollectionId,
                        ID.unique(),
                        {
                            name: admin.name,
                            email: admin.email,
                            colleges: [tenant.$id],
                        }
                    );

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
        } catch {
            throw new NotFoundError('Tenant');
        }
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
        await this.getById(tenantId); // Verify exists

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

        return await databases.updateDocument(this.databaseId, this.collectionId, tenantId, updateData);
    }

    /** Find team for a college and return its members */
    async getTeamMembers(tenantId: string) {
        const tenant = await this.getById(tenantId);
        const collegeName = (tenant as any).collegeName;
        const collegeId = (tenant as any).collegeId;
        const searchName = `${collegeName} (${collegeId})`;

        // Search for teams matching this college (use the search param, not Query.search)
        const teamsList = await appwriteTeams.list([], searchName);
        if (teamsList.total === 0) {
            return { teamId: null, members: [] };
        }

        // Find exact match from search results
        const team = teamsList.teams.find((t) => t.name === searchName) || teamsList.teams[0];
        const memberships = await appwriteTeams.listMemberships(team.$id, [Query.limit(100)]);

        const members = memberships.memberships.map((m) => ({
            $id: m.$id,
            userId: m.userId,
            userName: m.userName,
            userEmail: m.userEmail,
            roles: m.roles,
            joined: m.$createdAt,
        }));

        return { teamId: team.$id, members };
    }
}

export const tenantService = new TenantService();
