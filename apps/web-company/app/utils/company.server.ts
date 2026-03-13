import { api, type SessionUser } from '@careernest/lib';
import { logout, requireUserSession } from '~/auth.server';

export interface CompanyUser extends SessionUser {
    role: 'company';
    tenantId: string;
    companyId: string;
}

export interface CompanyProfile {
    id: string;
    tenantId: string;
    name: string;
    contactEmail: string;
    contactPhone: string;
    contactPerson: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface CompanyDrive {
    id: string;
    companyId: string;
    companyName: string;
    title: string;
    status: string;
    jobLevel: string;
    jobType: string;
    experience: string;
    ctcPeriod: string;
    location: string;
    vacancies: number;
    description: string;
    salary: number;
    deadline: string;
    department: string[];
    studyingYear: string;
    externalLink: string;
    CGPA: number;
    Backlogs: number;
    createdAt: string;
    updatedAt: string;
}

export interface DriveApplicationSummary {
    total: number;
    applied: number;
    underReview: number;
    shortlisted: number;
    interviewScheduled: number;
    selected: number;
    rejected: number;
}

function isCompanyUser(user: SessionUser): user is CompanyUser {
    return user.role === 'company' && typeof user.tenantId === 'string' && typeof user.companyId === 'string';
}

export function mapCompanyProfile(doc: Record<string, unknown>): CompanyProfile {
    return {
        id: String(doc.$id ?? doc.id ?? ''),
        tenantId: String(doc.tenantId ?? ''),
        name: String(doc.name ?? ''),
        contactEmail: String(doc.contactEmail ?? doc.email ?? ''),
        contactPhone: String(doc.contactPhone ?? doc.phone ?? ''),
        contactPerson: String(doc.contactPerson ?? ''),
        status: String(doc.status ?? 'active'),
        createdAt: String(doc.$createdAt ?? ''),
        updatedAt: String(doc.$updatedAt ?? ''),
    };
}

export function mapCompanyDrive(doc: Record<string, unknown>, company: CompanyProfile): CompanyDrive {
    return {
        id: String(doc.$id ?? doc.id ?? ''),
        companyId: company.id,
        companyName: company.name,
        title: String(doc.title ?? ''),
        status: String(doc.status ?? 'draft'),
        jobLevel: String(doc.jobLevel ?? ''),
        jobType: String(doc.jobType ?? ''),
        experience: String(doc.experience ?? ''),
        ctcPeriod: String(doc.ctcPeriod ?? 'annual'),
        location: String(doc.location ?? ''),
        vacancies: Number(doc.vacancies ?? 0),
        description: String(doc.description ?? ''),
        salary: Number(doc.salary ?? 0),
        deadline: String(doc.deadline ?? ''),
        department: Array.isArray(doc.department)
            ? doc.department.map((item) => String(item))
            : doc.department
                ? [String(doc.department)]
                : [],
        studyingYear: String(doc.studyingYear ?? ''),
        externalLink: String(doc.externalLink ?? ''),
        CGPA: Number(doc.CGPA ?? 0),
        Backlogs: Number(doc.Backlogs ?? 0),
        createdAt: String(doc.$createdAt ?? ''),
        updatedAt: String(doc.$updatedAt ?? ''),
    };
}

function summarizeApplications(documents: Array<Record<string, unknown>>, total: number): DriveApplicationSummary {
    const summary: DriveApplicationSummary = {
        total,
        applied: 0,
        underReview: 0,
        shortlisted: 0,
        interviewScheduled: 0,
        selected: 0,
        rejected: 0,
    };

    for (const application of documents) {
        switch (application.stage) {
            case 'under_review':
                summary.underReview += 1;
                break;
            case 'shortlisted':
                summary.shortlisted += 1;
                break;
            case 'interview_scheduled':
                summary.interviewScheduled += 1;
                break;
            case 'selected':
                summary.selected += 1;
                break;
            case 'rejected':
                summary.rejected += 1;
                break;
            default:
                summary.applied += 1;
                break;
        }
    }

    return summary;
}

export async function requireCompanyContext(request: Request): Promise<{
    token: string;
    user: CompanyUser;
    company: CompanyProfile;
}> {
    const { token, user } = await requireCompanyUserSession(request);

    try {
        const companyRes = await api.companies.getById(token, user.companyId) as {
            data: Record<string, unknown>;
        };

        return {
            token,
            user,
            company: mapCompanyProfile(companyRes.data || {}),
        };
    } catch {
        throw await logout(request);
    }
}

export async function requireCompanyUserSession(request: Request): Promise<{
    token: string;
    user: CompanyUser;
}> {
    const { token, user } = await requireUserSession(request);

    if (!isCompanyUser(user)) {
        throw await logout(request);
    }

    return { token, user };
}

export async function loadCompanyDrives(token: string, user: CompanyUser, company: CompanyProfile): Promise<CompanyDrive[]> {
    const drivesRes = await api.drives
        .list(token, `tenantId=${user.tenantId}&companyId=${user.companyId}&limit=500`)
        .catch(() => ({ data: [], total: 0 })) as {
        data: Array<Record<string, unknown>>;
        total: number;
    };

    return (drivesRes.data || []).map((drive) => mapCompanyDrive(drive, company));
}

export async function loadDriveApplicationSummaries(
    token: string,
    drives: CompanyDrive[],
): Promise<Record<string, DriveApplicationSummary>> {
    const entries = await Promise.all(
        drives.map(async (drive) => {
            const response = await api.applications
                .list(token, `driveId=${drive.id}&limit=500`)
                .catch(() => ({ data: [], total: 0 })) as {
                data: Array<Record<string, unknown>>;
                total: number;
            };

            const documents = response.data || [];
            return [
                drive.id,
                summarizeApplications(documents, response.total ?? documents.length),
            ] as const;
        }),
    );

    return Object.fromEntries(entries);
}

export function formatSalaryDisplay(salary: number, period: string): string {
    if (salary <= 0) return 'Not disclosed';
    if (period === 'monthly') return `Rs ${salary.toLocaleString('en-IN')}/mo`;
    if (salary >= 100000) return `Rs ${(salary / 100000).toFixed(1)} LPA`;
    return `Rs ${salary.toLocaleString('en-IN')}`;
}

export function formatJobLevelLabel(level: string): string {
    const labels: Record<string, string> = {
        internship: 'Internship',
        entry: 'Entry Level',
        junior: 'Junior',
        mid: 'Mid Level',
        senior: 'Senior',
    };

    return labels[level] || level || 'Role';
}

export function formatJobTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        'full-time': 'Full Time',
        'part-time': 'Part Time',
        internship: 'Internship',
        contract: 'Contract',
        freelance: 'Freelance',
    };

    return labels[type] || type || 'Hiring';
}

export function getDaysUntil(deadline: string): number {
    if (!deadline) return -1;
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
