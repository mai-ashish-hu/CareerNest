import { databases } from '../config/appwrite';
import { env } from '../config/env';
import { Query } from 'node-appwrite';
import { PlacementAnalytics } from '@careernest/shared';
import { companyService } from './company.service';

export class AnalyticsService {
    private readonly databaseId = env.APPWRITE_DATABASE_ID;

    async getPlacementAnalytics(tenantId: string): Promise<PlacementAnalytics> {
        // Get all students for this tenant
        const allStudents = await databases.listDocuments(
            this.databaseId,
            env.COLLECTION_STUDENTS,
            [Query.equal('tenantId', tenantId), Query.limit(5000)]
        );

        const totalStudents = allStudents.total;
        const placedStudents = allStudents.documents.filter((s) => s.isPlaced === true).length;
        const placementPercentage = totalStudents > 0
            ? Math.round((placedStudents / totalStudents) * 1000) / 10
            : 0;

        // Department-wise stats
        const deptMap = new Map<string, { total: number; placed: number }>();
        for (const student of allStudents.documents) {
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

        const allDrives = await databases.listDocuments(
            this.databaseId,
            env.COLLECTION_DRIVES,
            [Query.limit(500), Query.orderDesc('$createdAt')]
        );

        // Keep only drives whose linked company belongs to this tenant
        const drives = allDrives.documents.filter((doc: any) => {
            const companyRef = doc.companies;
            if (!companyRef) return false;
            if (Array.isArray(companyRef)) {
                return companyRef.some((c: any) => tenantCompanyIds.has(c.$id || c));
            }
            return tenantCompanyIds.has(companyRef.$id || companyRef);
        });

        const driveConversion = [];
        for (const drive of drives) {
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

            // Get company name — extract from 'companies' relationship field
            let companyName = 'Unknown';
            try {
                const companyRef = (drive as any).companies;
                const companyId = Array.isArray(companyRef)
                    ? (companyRef[0]?.$id || companyRef[0])
                    : (companyRef?.$id || companyRef);
                if (companyId && typeof companyId === 'string') {
                    const company = await databases.getDocument(
                        this.databaseId,
                        env.COLLECTION_COMPANIES,
                        companyId
                    );
                    companyName = company.name as string;
                }
            } catch {
                // ignore — company might be deleted or relationship not expanded
            }

            driveConversion.push({
                driveId: drive.$id,
                company: companyName,
                applied,
                selected,
                rate: applied > 0 ? Math.round((selected / applied) * 10000) / 100 : 0,
            });
        }

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
