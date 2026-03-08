import { jobQueue } from './queue';
import { analyticsService } from '../services/analytics.service';

interface AnalyticsRecalcData {
    tenantId: string;
}

export function registerAnalyticsJobs(): void {
    jobQueue.register('recalculate-placement-stats', async (data: unknown) => {
        const { tenantId } = data as AnalyticsRecalcData;
        console.log(`[Analytics Job] Recalculating stats for tenant: ${tenantId}`);
        // Trigger analytics recalculation - results are computed on-the-fly
        // This job could cache results in the future
        await analyticsService.getPlacementAnalytics(tenantId);
        console.log(`[Analytics Job] Completed for tenant: ${tenantId}`);
    });

    console.log('[Jobs] Analytics jobs registered');
}
