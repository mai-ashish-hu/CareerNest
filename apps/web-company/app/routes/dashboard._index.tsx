import { Briefcase, Users, TrendingUp, FileText } from 'lucide-react';
import { StatCard, Card } from '@careernest/ui';
import type { MetaFunction } from '@remix-run/node';
export const meta: MetaFunction = () => [{ title: 'Dashboard – Company – CareerNest' }];
export default function CompanyDashIndex() {
    return (
        <div className="space-y-8 animate-fade-in">
            <div><h1 className="text-3xl font-bold text-surface-900">Company Dashboard</h1><p className="text-surface-500 mt-1">Manage your campus hiring drives</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Active Drives" value="--" icon={<Briefcase size={24} />} />
                <StatCard title="Total Applications" value="--" icon={<FileText size={24} />} />
                <StatCard title="Candidates Shortlisted" value="--" icon={<Users size={24} />} />
                <StatCard title="Selection Rate" value="--%" icon={<TrendingUp size={24} />} />
            </div>
            <Card><h3 className="font-semibold text-surface-900 mb-3">Getting Started</h3><p className="text-surface-600 text-sm">Welcome to your company portal. Create placement drives, review applications, and manage candidate pipelines.</p></Card>
        </div>
    );
}
