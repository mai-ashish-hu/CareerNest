import { clsx, type ClassValue } from 'clsx';
export function cn(...inputs: ClassValue[]) { return clsx(inputs); }
export function formatDate(d: string) { return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); }
export function formatCurrency(n: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n); }
export function getStageColor(s: string) {
    const c: Record<string, string> = { applied: 'bg-blue-100 text-blue-700', under_review: 'bg-amber-100 text-amber-700', shortlisted: 'bg-cyan-100 text-cyan-700', interview_scheduled: 'bg-purple-100 text-purple-700', selected: 'bg-emerald-100 text-emerald-700', rejected: 'bg-rose-100 text-rose-700' };
    return c[s] || 'bg-surface-100 text-surface-700';
}
export function getStatusColor(s: string) {
    const c: Record<string, string> = { active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-surface-100 text-surface-600', suspended: 'bg-rose-100 text-rose-700', blocked: 'bg-rose-100 text-rose-700', draft: 'bg-amber-100 text-amber-700', closed: 'bg-surface-100 text-surface-600' };
    return c[s] || 'bg-surface-100 text-surface-700';
}
