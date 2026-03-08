import { Plus, Search } from 'lucide-react';
import { Button, Card } from '@careernest/ui';
import type { MetaFunction } from '@remix-run/node';
export const meta: MetaFunction = () => [{ title: 'Drives – Company – CareerNest' }];
export default function CompanyDrives() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-surface-900">My Drives</h1><p className="text-surface-500 mt-1">Manage your placement drives</p></div><Button><Plus size={18} /> Create Drive</Button></div>
            <Card><div className="flex items-center gap-4"><div className="relative flex-1"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" /><input type="text" placeholder="Search drives..." className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" /></div><select className="form-input w-40"><option value="">All Status</option><option value="draft">Draft</option><option value="active">Active</option><option value="closed">Closed</option></select></div></Card>
            <Card><div className="text-center py-12 text-surface-400"><p>No drives created yet.</p></div></Card>
        </div>
    );
}
