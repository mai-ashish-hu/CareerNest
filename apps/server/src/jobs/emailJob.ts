import { jobQueue } from './queue';
import { emailService } from '../services/email.service';

interface StageUpdateEmailData {
    studentEmail: string;
    studentName: string;
    driveName: string;
    companyName: string;
    newStage: string;
}

interface CredentialEmailData {
    email: string;
    name: string;
    role: string;
    tempPassword: string;
}

// Register email job handlers
export function registerEmailJobs(): void {
    jobQueue.register('send-stage-update-email', async (data: unknown) => {
        const { studentEmail, studentName, driveName, companyName, newStage } = data as StageUpdateEmailData;
        await emailService.sendStageUpdateEmail(studentEmail, studentName, driveName, companyName, newStage);
    });

    jobQueue.register('send-credential-email', async (data: unknown) => {
        const { email, name, role, tempPassword } = data as CredentialEmailData;
        await emailService.sendCredentialEmail(email, name, role, tempPassword);
    });

    console.log('[Jobs] Email jobs registered');
}
