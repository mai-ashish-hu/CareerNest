import { Card, Button } from '@careernest/ui';
import { Building2, Mail, Phone, User } from 'lucide-react';
import type { MetaFunction } from '@remix-run/node';
export const meta: MetaFunction = () => [{ title: 'Settings – Company – CareerNest' }];
export default function CompanySettings() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div><h1 className="text-2xl font-bold text-surface-900">Company Settings</h1><p className="text-surface-500 mt-1">Manage your company profile</p></div>
            <Card><h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2"><Building2 size={20} /> Company Information</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm"><div><p className="text-surface-500">Company Name</p><p className="font-medium text-surface-900 mt-1">--</p></div><div><p className="text-surface-500 flex items-center gap-1"><Mail size={14} /> Email</p><p className="font-medium text-surface-900 mt-1">--</p></div><div><p className="text-surface-500 flex items-center gap-1"><Phone size={14} /> Phone</p><p className="font-medium text-surface-900 mt-1">--</p></div><div><p className="text-surface-500 flex items-center gap-1"><User size={14} /> Contact</p><p className="font-medium text-surface-900 mt-1">--</p></div></div><div className="mt-6 pt-4 border-t border-surface-100"><Button variant="outline" size="sm">Edit Profile</Button></div></Card>
        </div>
    );
}
