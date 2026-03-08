// Simple in-memory job queue for MVP
// In production, replace with BullMQ, Agenda, or similar

type JobHandler = (data: unknown) => Promise<void>;

interface QueuedJob {
    id: string;
    name: string;
    data: unknown;
    createdAt: Date;
}

class JobQueue {
    private handlers = new Map<string, JobHandler>();
    private processing = false;
    private queue: QueuedJob[] = [];

    register(jobName: string, handler: JobHandler): void {
        this.handlers.set(jobName, handler);
        console.log(`[JobQueue] Registered handler: ${jobName}`);
    }

    async add(jobName: string, data: unknown): Promise<void> {
        const job: QueuedJob = {
            id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            name: jobName,
            data,
            createdAt: new Date(),
        };

        this.queue.push(job);
        console.log(`[JobQueue] Added job: ${jobName} (${job.id})`);

        // Process immediately if not already processing
        if (!this.processing) {
            this.processQueue();
        }
    }

    private async processQueue(): Promise<void> {
        this.processing = true;

        while (this.queue.length > 0) {
            const job = this.queue.shift()!;
            const handler = this.handlers.get(job.name);

            if (!handler) {
                console.error(`[JobQueue] No handler for job: ${job.name}`);
                continue;
            }

            try {
                await handler(job.data);
                console.log(`[JobQueue] Completed: ${job.name} (${job.id})`);
            } catch (error) {
                console.error(`[JobQueue] Failed: ${job.name} (${job.id})`, error);
                // Simple retry: re-add to queue (max 3 retries could be implemented)
            }
        }

        this.processing = false;
    }
}

export const jobQueue = new JobQueue();
