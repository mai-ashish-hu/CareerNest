import { databases } from '../config/appwrite';
import { env } from '../config/env';
import { Query } from 'node-appwrite';
import { PlacementAnalytics } from '@careernest/shared';
import { companyService } from './company.service';

const MAX_ANALYTICS_ROWS = 5000;
const PAGE_SIZE = 500;

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

export class AnalyticsService {
    private readonly databaseId = env.APPWRITE_DATABASE_ID;

    private async listStudentsByTenant(tenantId: string): Promise<Array<Record<string, any>>> {
        const students: Array<Record<string, any>> = [];
        let offset = 0;
        let total = Number.POSITIVE_INFINITY;

        while (offset < total && students.length < MAX_ANALYTICS_ROWS) {
            const page = await databases.listDocuments(
                this.databaseId,
                env.COLLECTION_STUDENTS,
                [
                    Query.equal('tenantId', tenantId),
                    Query.limit(PAGE_SIZE),
                    Query.offset(offset),
                ]
            );

            students.push(...(page.documents as Array<Record<string, any>>));
            total = page.total;

            if (page.documents.length === 0) {
                break;
            }

            offset += page.documents.length;
        }

        return students;
    }

    private extractCompanyIdFromDrive(drive: Record<string, any>): string {
        const companyRef = drive.companies;
        if (!companyRef) return '';
        if (Array.isArray(companyRef)) {
            const first = companyRef[0];
            if (!first) return '';
            return typeof first === 'string' ? first : String(first.$id || '');
        }
        return typeof companyRef === 'string' ? companyRef : String(companyRef.$id || '');
    }

    async getPlacementAnalytics(tenantId: string): Promise<PlacementAnalytics> {
        // Process students in pages to avoid one large read while preserving analytics behavior.
        const studentDocs = await this.listStudentsByTenant(tenantId);

        const totalStudents = studentDocs.length;
        const placedStudents = studentDocs.filter((s) => s.isPlaced === true).length;
        const placementPercentage = totalStudents > 0
            ? Math.round((placedStudents / totalStudents) * 1000) / 10
            : 0;

        // Department-wise stats
        const deptMap = new Map<string, { total: number; placed: number }>();
        for (const student of studentDocs) {
            const deptField = (student as any).departements || (student as any).departments || student.department;
            const dept = typeof deptField === 'object' && deptField !== null
                ? (deptField.departmentName || deptField.$id || '')
                : String(deptField || '');
            if (!deptMap.has(dept)) {
                deptMap.set(dept, { total: 0, placed: 0 });
            }
            const stats = deptMap.get(dept)!;
            stats.total++;
            if (student.isPlaced) stats.placed++;
        }

        const departmentStats = Array.from(deptMap.entries()).map(([department, stats]) => ({
            department,
            total: stats.total,
            placed: stats.placed,
            percentage: stats.total > 0 ? Math.round((stats.placed / stats.total) * 1000) / 10 : 0,
        }));

        // Drive conversion metrics
        // Drives are linked to tenants via companies, not via a direct tenantId field.
        // Fetch tenant's company IDs first, then filter drives by those companies.
        const companiesResult = await companyService.list(tenantId, 1, 500);
        const tenantCompanyIds = new Set(companiesResult.companies.map((c: any) => c.$id as string));
        const companyNameById = new Map<string, string>(
            companiesResult.companies.map((company: any) => [String(company.$id), String(company.name || 'Unknown')])
        );

        const allDrives = await databases.listDocuments(
            this.databaseId,
            env.COLLECTION_DRIVES,
            [Query.limit(500), Query.orderDesc('$createdAt')]
        );

        // Keep only drives whose linked company belongs to this tenant
        const drives = allDrives.documents.filter((doc: any) => {
            const companyId = this.extractCompanyIdFromDrive(doc as Record<string, any>);
            return companyId ? tenantCompanyIds.has(companyId) : false;
        });

        const driveConversion = await mapInBatches(drives, 20, async (drive: any) => {
            const applications = await databases.listDocuments(
                this.databaseId,
                env.COLLECTION_APPLICATIONS,
                [
                    Query.equal('tenantId', tenantId),
                    Query.equal('driveId', drive.$id),
                    Query.limit(5000),
                ]
            );

            const applied = applications.total;
            const selected = applications.documents.filter((a) => a.stage === 'selected').length;

            const companyId = this.extractCompanyIdFromDrive(drive as Record<string, any>);
            const companyName = companyNameById.get(companyId) || 'Unknown';

            return {
                driveId: drive.$id,
                company: companyName,
                applied,
                selected,
                rate: applied > 0 ? Math.round((selected / applied) * 10000) / 100 : 0,
            };
        });

        return {
            placementPercentage,
            totalStudents,
            placedStudents,
            departmentStats,
            driveConversion,
        };
    }
}

export const analyticsService = new AnalyticsService();
