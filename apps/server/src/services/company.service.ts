import { databases, users as appwriteUsers, teams as appwriteTeams } from '../config/appwrite';
import { env } from '../config/env';
import { ID, Query } from 'node-appwrite';
import { NotFoundError } from '../utils/errors';
import { CreateCompanyInput, UpdateCompanyInput } from '@careernest/shared';

export class CompanyService {
    private readonly databaseId = env.APPWRITE_DATABASE_ID;
    private readonly collectionId = env.COLLECTION_COMPANIES;

    /**
     * Find or create a single global "Companies" team.
     * All company users across all colleges are members of this one team.
     * College association is determined from the database (colleges relationship).
     */
    private async findOrCreateCompaniesTeam(): Promise<string> {
        const teamName = 'Companies';

        // Search for existing team
        const teamsList = await appwriteTeams.list([], teamName);
        const existing = teamsList.teams.find((t) => t.name === teamName);
        if (existing) return existing.$id;

        // Create the global Companies team
        const team = await appwriteTeams.create(ID.unique(), teamName);
        return team.$id;
    }

    async create(tenantId: string, data: CreateCompanyInput) {
        // 1. Create an Appwrite auth user for the company
        const newUser = await appwriteUsers.create(
            ID.unique(),
            data.contactEmail,
            undefined,          // phone
            data.password,
            data.contactPerson,
        );

        // 2. Set "company" label on the user
        await appwriteUsers.updateLabels(newUser.$id, ['company']);

        // 3. Find or create the global Companies team
        const teamId = await this.findOrCreateCompaniesTeam();

        // 4. Add company user to the team with "company" role
        await appwriteTeams.createMembership(
            teamId,
            ['company'],          // roles inside the team
            data.contactEmail,    // email
            newUser.$id,          // userId
            undefined,            // phone
            undefined,            // url
            data.contactPerson,   // name
        );

        // 5. Create the company document in the database
        const company = await databases.createDocument(
            this.databaseId,
            this.collectionId,
            ID.unique(),
            {
                name: data.name,
                contactEmail: data.contactEmail,
                contactPhone: data.contactPhone,
                contactPerson: data.contactPerson,
                colleges: tenantId,
            }
        );

        return { ...company, userId: newUser.$id, teamId };
    }

    /**
     * Check whether a company document belongs to a given tenant.
     * Handles both `tenantId` (plain string) and `colleges` (relationship) schemas.
     */
    private belongsToTenant(doc: any, tenantId: string): boolean {
        if (doc.tenantId && doc.tenantId === tenantId) return true;
        const colleges = doc.colleges;
        if (Array.isArray(colleges)) {
            return colleges.some((c: any) => (c.$id || c) === tenantId);
        }
        if (colleges) {
            return (colleges.$id || colleges) === tenantId;
        }
        return false;
    }

    async getById(companyId: string, tenantId?: string | null) {
        try {
            const company = await databases.getDocument(this.databaseId, this.collectionId, companyId);

            if (tenantId && !this.belongsToTenant(company as any, tenantId)) {
                throw new NotFoundError('Company');
            }

            return company;
        } catch {
            throw new NotFoundError('Company');
        }
    }

    async list(tenantId: string, page: number, limit: number, status?: string) {
        // Try querying by tenantId field directly first (faster)
        let companies: any[] = [];
        let total = 0;

        try {
            const queries = [
                Query.equal('tenantId', tenantId),
                Query.limit(limit),
                Query.offset((page - 1) * limit),
                Query.orderDesc('$createdAt'),
            ];
            if (status) {
                queries.push(Query.equal('status', status));
            }

            const result = await databases.listDocuments(this.databaseId, this.collectionId, queries);
            companies = result.documents;
            total = result.total;
        } catch {
            // tenantId attribute might not exist — fall back to fetching all + filtering
            const result = await databases.listDocuments(this.databaseId, this.collectionId, [
                Query.limit(500),
                Query.orderDesc('$createdAt'),
            ]);

            companies = result.documents.filter((doc: any) => {
                if (!this.belongsToTenant(doc, tenantId)) {
                    return false;
                }
                return status ? doc.status === status : true;
            });
            total = companies.length;
            const start = (page - 1) * limit;
            companies = companies.slice(start, start + limit);
        }

        return { companies, total };
    }

    async update(companyId: string, tenantId: string, data: UpdateCompanyInput) {
        await this.getById(companyId, tenantId); // Verify exists + tenant match

        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
        if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
        if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
        if (data.status !== undefined) updateData.status = data.status;

        return await databases.updateDocument(this.databaseId, this.collectionId, companyId, updateData);
    }
}

export const companyService = new CompanyService();
