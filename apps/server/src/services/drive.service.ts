import { databases } from '../config/appwrite';
import { env } from '../config/env';
import { ID, Query } from 'node-appwrite';
import { NotFoundError } from '../utils/errors';
import { CreateDriveInput, UpdateDriveInput } from '@careernest/shared';
import { companyService } from './company.service';

/**
 * Simple in-memory cache for tenant→companyIds mapping.
 * Avoids fetching all companies on every drive list call.
 */
const companyIdsCache = new Map<string, { ids: Set<string>; expiresAt: number }>();
const COMPANY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getTenantCompanyIds(tenantId: string): Promise<Set<string>> {
    const cached = companyIdsCache.get(tenantId);
    if (cached && Date.now() < cached.expiresAt) return cached.ids;

    const result = await companyService.list(tenantId, 1, 500);
    const ids = new Set(result.companies.map((c: any) => c.$id as string));
    companyIdsCache.set(tenantId, { ids, expiresAt: Date.now() + COMPANY_CACHE_TTL });
    return ids;
}

export class DriveService {
    private readonly databaseId = env.APPWRITE_DATABASE_ID;
    private readonly collectionId = env.COLLECTION_DRIVES;

    async create(_tenantId: string, data: CreateDriveInput) {
        const drive = await databases.createDocument(
            this.databaseId,
            this.collectionId,
            ID.unique(),
            {
                companies: [data.companies],
                title: data.title,
                status: data.status ?? 'active',
                jobLevel: data.jobLevel,
                jobType: data.jobType,
                experience: data.experience,
                ctcPeriod: data.ctcPeriod,
                location: data.location,
                vacancies: data.vacancies,
                description: data.description || '',
                salary: data.salary,
                deadline: data.deadline,
                department: data.department,
                studyingYear: data.studyingYear,
                ...(data.externalLink ? { externalLink: data.externalLink } : {}),
                CGPA: data.CGPA,
                Backlogs: data.Backlogs,
            }
        );

        return drive;
    }

    async getById(driveId: string, tenantId?: string) {
        try {
            const drive = await databases.getDocument(this.databaseId, this.collectionId, driveId);

            // If tenantId supplied, verify the linked company belongs to that tenant
            if (tenantId) {
                const companyRef = (drive as any).companies;
                const companyId = Array.isArray(companyRef)
                    ? (companyRef[0]?.$id || companyRef[0])
                    : (companyRef?.$id || companyRef);
                if (companyId) {
                    try {
                        await companyService.getById(companyId, tenantId);
                    } catch {
                        throw new NotFoundError('Drive');
                    }
                }
            }

            return drive;
        } catch {
            throw new NotFoundError('Drive');
        }
    }

    async list(tenantId: string, page: number, limit: number, filters: { companyId?: string } = {}) {
        // Get tenant's company IDs (cached)
        const tenantCompanyIds = await getTenantCompanyIds(tenantId);

        // Fetch drives
        const result = await databases.listDocuments(this.databaseId, this.collectionId, [
            Query.limit(500),
            Query.orderDesc('$createdAt'),
        ]);

        // Keep only drives whose linked company belongs to this tenant
        let drives = result.documents.filter((doc: any) => {
            const companyRef = doc.companies;
            if (!companyRef) return false;
            if (Array.isArray(companyRef)) {
                return companyRef.some((c: any) => tenantCompanyIds.has(c.$id || c));
            }
            return tenantCompanyIds.has(companyRef.$id || companyRef);
        });

        if (filters.companyId) {
            drives = drives.filter((doc: any) => {
                const companyRef = doc.companies;
                if (Array.isArray(companyRef)) {
                    return companyRef.some((c: any) => (c.$id || c) === filters.companyId);
                }
                return (companyRef?.$id || companyRef) === filters.companyId;
            });
        }

        const total = drives.length;
        const start = (page - 1) * limit;
        const paged = drives.slice(start, start + limit);

        return { drives: paged, total };
    }

    async listForCompany(tenantId: string, companyId: string, page: number, limit: number) {
        return this.list(tenantId, page, limit, { companyId });
    }

    async update(driveId: string, tenantId: string, data: UpdateDriveInput) {
        await this.getById(driveId, tenantId);

        const updateData: Record<string, unknown> = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.jobLevel !== undefined) updateData.jobLevel = data.jobLevel;
        if (data.jobType !== undefined) updateData.jobType = data.jobType;
        if (data.experience !== undefined) updateData.experience = data.experience;
        if (data.ctcPeriod !== undefined) updateData.ctcPeriod = data.ctcPeriod;
        if (data.location !== undefined) updateData.location = data.location;
        if (data.vacancies !== undefined) updateData.vacancies = data.vacancies;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.salary !== undefined) updateData.salary = data.salary;
        if (data.deadline !== undefined) updateData.deadline = data.deadline;
        if (data.department !== undefined) updateData.department = data.department;
        if (data.studyingYear !== undefined) updateData.studyingYear = data.studyingYear;
        if (data.externalLink !== undefined) updateData.externalLink = data.externalLink;
        if (data.CGPA !== undefined) updateData.CGPA = data.CGPA;
        if (data.Backlogs !== undefined) updateData.Backlogs = data.Backlogs;

        return await databases.updateDocument(this.databaseId, this.collectionId, driveId, updateData);
    }
}

export const driveService = new DriveService();
