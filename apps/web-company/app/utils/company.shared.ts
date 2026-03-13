export function formatSalaryDisplay(salary: number, period: string): string {
    if (salary <= 0) return 'Not disclosed';
    if (period === 'monthly') return `Rs ${salary.toLocaleString('en-IN')}/mo`;
    if (salary >= 100000) return `Rs ${(salary / 100000).toFixed(1)} LPA`;
    return `Rs ${salary.toLocaleString('en-IN')}`;
}

export function formatJobLevelLabel(level: string): string {
    const labels: Record<string, string> = {
        internship: 'Internship',
        trainee: 'Trainee',
        fresher: 'Fresher',
        junior: 'Junior',
        mid: 'Mid-level',
        senior: 'Senior',
        lead: 'Lead',
    };
    return labels[level] ?? level;
}

export function formatJobTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        full_time: 'Full-time',
        part_time: 'Part-time',
        internship: 'Internship',
        contract: 'Contract',
        remote: 'Remote',
        hybrid: 'Hybrid',
    };
    return labels[type] ?? type;
}

export function getDaysUntil(deadline: string): number {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
