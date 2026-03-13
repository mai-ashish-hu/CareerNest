import { useState } from 'react';
import {
    Globe,
    Mail,
    Shield,
    ToggleLeft,
    AlertTriangle,
    Info,
    Wrench,
} from 'lucide-react';
import { Card } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [
    { title: 'Settings – Super Admin – CareerNest' },
];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);

    const statsRes = await api.admin.stats(token).catch(() => ({ data: {} })) as { data: Record<string, number> };
    const stats = statsRes.data || {};

    return json({
        stats: {
            totalTenants: stats.totalTenants ?? 0,
            totalUsers: stats.totalUsers ?? 0,
            totalStudents: stats.totalStudents ?? 0,
            totalCompanies: stats.totalCompanies ?? 0,
            totalDrives: stats.totalDrives ?? 0,
        },
    });
}

export default function AdminSettings() {
    const { stats } = useLoaderData<typeof loader>() as { stats: Record<string, number> };
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'General', icon: Globe },
        { id: 'email', label: 'Email / SMTP', icon: Mail },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'features', label: 'Feature Flags', icon: ToggleLeft },
        { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-surface-900">
                    Platform Settings
                </h1>
                <p className="text-surface-500 mt-1">
                    Global configuration and system preferences
                </p>
            </div>

            <div className="flex gap-6">
                {/* Settings Sidebar */}
                <div className="w-56 flex-shrink-0">
                    <Card>
                        <div className="p-2 space-y-1">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                                            activeTab === tab.id
                                                ? 'bg-primary-50 text-primary-700 font-medium'
                                                : 'text-surface-500 hover:bg-surface-50 hover:text-surface-700'
                                        }`}
                                    >
                                        <Icon size={16} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                {/* Settings Content */}
                <div className="flex-1">
                    {activeTab === 'general' && (
                        <Card>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Globe size={20} className="text-primary-600" />
                                    <h3 className="font-semibold text-surface-900">
                                        General Settings
                                    </h3>
                                </div>

                                <EnvNotice />

                                <div className="space-y-4">
                                    <ReadOnlyField label="Platform Name" value="CareerNest" />
                                    <ReadOnlyField label="Platform URL" value="https://careernest.com" />
                                    <ReadOnlyField label="Support Email" value="support@careernest.com" />
                                    <ReadOnlyField label="Default Timezone" value="Asia/Kolkata (IST)" />
                                </div>

                                <div className="p-4 bg-surface-50 rounded-xl space-y-3">
                                    <h4 className="text-sm font-medium text-surface-700">
                                        Platform Overview
                                    </h4>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                        <StatRow label="Colleges" value={stats.totalTenants} />
                                        <StatRow label="Total Users" value={stats.totalUsers} />
                                        <StatRow label="Students" value={stats.totalStudents} />
                                        <StatRow label="Companies" value={stats.totalCompanies} />
                                        <StatRow label="Active Drives" value={stats.totalDrives} />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'email' && (
                        <Card>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Mail size={20} className="text-primary-600" />
                                    <h3 className="font-semibold text-surface-900">
                                        SMTP Configuration
                                    </h3>
                                </div>

                                <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-2">
                                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                    <span>
                                        SMTP settings are configured via environment variables
                                        on the server. They cannot be changed from this panel.
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <ReadOnlyField label="SMTP Host" value="Configured via SMTP_HOST env" />
                                        <ReadOnlyField label="SMTP Port" value="Configured via SMTP_PORT env" />
                                    </div>
                                    <ReadOnlyField label="From Address" value="Configured via SMTP_FROM env" />
                                </div>

                                <div className="p-4 bg-surface-50 rounded-xl">
                                    <h4 className="text-sm font-medium text-surface-700 mb-2">
                                        Email Templates
                                    </h4>
                                    <div className="space-y-2">
                                        {[
                                            'Application Confirmation',
                                            'Shortlist Notification',
                                            'Interview Schedule',
                                            'Selection Notification',
                                            'Credential Delivery',
                                        ].map((template) => (
                                            <div
                                                key={template}
                                                className="flex items-center justify-between py-2 px-3 bg-white rounded-lg"
                                            >
                                                <span className="text-sm text-surface-600">
                                                    {template}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                    Active
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'security' && (
                        <Card>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Shield size={20} className="text-primary-600" />
                                    <h3 className="font-semibold text-surface-900">
                                        Security Policies
                                    </h3>
                                </div>

                                <EnvNotice />

                                <div className="space-y-4">
                                    <SettingDisplay
                                        label="Two-Factor Authentication for TPOs"
                                        description="Require 2FA for all TPO accounts"
                                        enabled={false}
                                    />
                                    <SettingDisplay
                                        label="Force Password Reset on First Login"
                                        description="Require users to change password after first login"
                                        enabled={true}
                                    />
                                    <SettingDisplay
                                        label="Login IP Restriction"
                                        description="Restrict logins to whitelisted IPs for TPOs"
                                        enabled={false}
                                    />
                                    <SettingDisplay
                                        label="Audit Log Retention"
                                        description="Keep audit logs for 90 days"
                                        enabled={true}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <ReadOnlyField label="Session Timeout" value="60 minutes" />
                                    <ReadOnlyField label="Rate Limit" value="100 requests / 15 min" />
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'features' && (
                        <Card>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <ToggleLeft size={20} className="text-primary-600" />
                                    <h3 className="font-semibold text-surface-900">
                                        Feature Flags
                                    </h3>
                                </div>

                                <EnvNotice />

                                <div className="space-y-4">
                                    <SettingDisplay label="Student Self-Registration" description="Allow students to register without TPO invitation" enabled={false} />
                                    <SettingDisplay label="Company Self-Registration" description="Allow companies to register and post drives" enabled={false} />
                                    <SettingDisplay label="Resume Uploads" description="Allow students to upload resumes" enabled={true} />
                                    <SettingDisplay label="Email Notifications" description="Send email notifications for stage changes" enabled={true} />
                                    <SettingDisplay label="Multi-College Company Access" description="Allow companies to post in multiple colleges" enabled={false} />
                                    <SettingDisplay label="Advanced Analytics" description="Enable advanced analytics dashboards for TPOs" enabled={true} />
                                    <SettingDisplay label="Placement Certificate Generation" description="Auto-generate placement certificates" enabled={false} />
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'maintenance' && (
                        <Card>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Wrench size={20} className="text-primary-600" />
                                    <h3 className="font-semibold text-surface-900">
                                        System Information
                                    </h3>
                                </div>

                                <div className="p-4 bg-surface-50 rounded-xl space-y-3">
                                    <h4 className="text-sm font-medium text-surface-700">
                                        Runtime Details
                                    </h4>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                        <StatRow label="API Version" value="v1.0.0" />
                                        <StatRow label="Node.js" value="v20.x" />
                                        <StatRow label="Database" value="Appwrite Cloud" />
                                        <StatRow label="Environment" value="Development" />
                                        <StatRow label="Colleges Online" value={stats.totalTenants} />
                                        <StatRow label="Registered Users" value={stats.totalUsers} />
                                    </div>
                                </div>

                                <SettingDisplay
                                    label="Maintenance Mode"
                                    description="Show maintenance page to all portal users"
                                    enabled={false}
                                />

                                <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-2">
                                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                    <span>
                                        Maintenance mode toggling requires a server-side configuration change.
                                        Contact the infrastructure team to enable or disable it.
                                    </span>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

function EnvNotice() {
    return (
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 flex items-start gap-2">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <span>
                These settings are managed via server environment variables
                and displayed here for reference.
            </span>
        </div>
    );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <label className="form-label">{label}</label>
            <div className="form-input bg-surface-50 text-surface-600 cursor-not-allowed">
                {value}
            </div>
        </div>
    );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex justify-between">
            <span className="text-surface-400">{label}</span>
            <span className="text-surface-700 font-medium">{value}</span>
        </div>
    );
}

function SettingDisplay({
    label,
    description,
    enabled,
}: {
    label: string;
    description: string;
    enabled: boolean;
}) {
    return (
        <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl">
            <div>
                <p className="text-sm font-medium text-surface-800">{label}</p>
                <p className="text-xs text-surface-400 mt-0.5">{description}</p>
            </div>
            <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    enabled
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-surface-200 text-surface-500'
                }`}
            >
                {enabled ? 'Enabled' : 'Disabled'}
            </span>
        </div>
    );
}
