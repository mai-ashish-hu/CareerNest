import { useState } from 'react';
import {
    Settings,
    Globe,
    Mail,
    Shield,
    Database,
    Key,
    Server,
    Bell,
    Palette,
    ToggleLeft,
    ToggleRight,
    Save,
    AlertTriangle,
    CheckCircle,
    Monitor,
    Wrench,
} from 'lucide-react';
import { Card, Button } from '@careernest/ui';
import type { MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => [
    { title: 'Settings – Super Admin – CareerNest' },
];

export default function AdminSettings() {
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

                                <div className="space-y-4">
                                    <div>
                                        <label className="form-label">Platform Name</label>
                                        <input
                                            type="text"
                                            defaultValue="CareerNest"
                                            className="form-input"
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Platform URL</label>
                                        <input
                                            type="text"
                                            defaultValue="https://careernest.com"
                                            className="form-input"
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Support Email</label>
                                        <input
                                            type="email"
                                            defaultValue="support@careernest.com"
                                            className="form-input"
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Default Timezone</label>
                                        <select className="form-input">
                                            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                            <option value="UTC">UTC</option>
                                            <option value="America/New_York">America/New_York (EST)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-surface-100">
                                    <Button>
                                        <Save size={16} /> Save Changes
                                    </Button>
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
                                        SMTP settings are configured via environment variables.
                                        Changes here require a server restart.
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="form-label">SMTP Host</label>
                                            <input
                                                type="text"
                                                placeholder="smtp.example.com"
                                                className="form-input"
                                                disabled
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">SMTP Port</label>
                                            <input
                                                type="number"
                                                placeholder="587"
                                                className="form-input"
                                                disabled
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="form-label">From Address</label>
                                        <input
                                            type="text"
                                            placeholder="CareerNest <noreply@careernest.com>"
                                            className="form-input"
                                            disabled
                                        />
                                    </div>
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
                                        Security Settings
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    <SettingToggle
                                        label="Two-Factor Authentication for TPOs"
                                        description="Require 2FA for all TPO accounts"
                                        defaultEnabled={false}
                                    />
                                    <SettingToggle
                                        label="Force Password Reset on First Login"
                                        description="Require users to change password after first login"
                                        defaultEnabled={true}
                                    />
                                    <SettingToggle
                                        label="Login IP Restriction"
                                        description="Restrict logins to whitelisted IPs for TPOs"
                                        defaultEnabled={false}
                                    />
                                    <SettingToggle
                                        label="Audit Log Retention"
                                        description="Keep audit logs for 90 days"
                                        defaultEnabled={true}
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Session Timeout (minutes)</label>
                                    <input
                                        type="number"
                                        defaultValue={60}
                                        className="form-input w-32"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">
                                        Rate Limit (requests per 15 min)
                                    </label>
                                    <input
                                        type="number"
                                        defaultValue={100}
                                        className="form-input w-32"
                                    />
                                </div>

                                <div className="flex justify-end pt-4 border-t border-surface-100">
                                    <Button>
                                        <Save size={16} /> Save Changes
                                    </Button>
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

                                <p className="text-sm text-surface-400">
                                    Toggle features across the platform. Changes affect all
                                    colleges.
                                </p>

                                <div className="space-y-4">
                                    <SettingToggle
                                        label="Student Self-Registration"
                                        description="Allow students to register without TPO invitation"
                                        defaultEnabled={false}
                                    />
                                    <SettingToggle
                                        label="Company Self-Registration"
                                        description="Allow companies to register and post drives"
                                        defaultEnabled={false}
                                    />
                                    <SettingToggle
                                        label="Resume Uploads"
                                        description="Allow students to upload resumes"
                                        defaultEnabled={true}
                                    />
                                    <SettingToggle
                                        label="Email Notifications"
                                        description="Send email notifications for stage changes"
                                        defaultEnabled={true}
                                    />
                                    <SettingToggle
                                        label="Multi-College Company Access"
                                        description="Allow companies to post in multiple colleges"
                                        defaultEnabled={false}
                                    />
                                    <SettingToggle
                                        label="Advanced Analytics"
                                        description="Enable advanced analytics dashboards for TPOs"
                                        defaultEnabled={true}
                                    />
                                    <SettingToggle
                                        label="Placement Certificate Generation"
                                        description="Auto-generate placement certificates"
                                        defaultEnabled={false}
                                    />
                                </div>

                                <div className="flex justify-end pt-4 border-t border-surface-100">
                                    <Button>
                                        <Save size={16} /> Save Changes
                                    </Button>
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
                                        Maintenance Mode
                                    </h3>
                                </div>

                                <div className="bg-red-50 rounded-xl p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <AlertTriangle size={20} className="text-red-600" />
                                        <h4 className="font-semibold text-red-800">
                                            Danger Zone
                                        </h4>
                                    </div>
                                    <p className="text-sm text-red-600 mb-4">
                                        Enabling maintenance mode will prevent all users
                                        (except Super Admins) from accessing the platform.
                                    </p>
                                    <SettingToggle
                                        label="Enable Maintenance Mode"
                                        description="Show maintenance page to all portal users"
                                        defaultEnabled={false}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="form-label">
                                            Maintenance Message
                                        </label>
                                        <textarea
                                            className="form-input resize-none"
                                            rows={3}
                                            defaultValue="We're currently performing scheduled maintenance. Please check back later."
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-surface-50 rounded-xl space-y-3">
                                    <h4 className="text-sm font-medium text-surface-700">
                                        System Information
                                    </h4>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-surface-400">API Version</span>
                                            <span className="text-surface-700">v1.0.0</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-surface-400">Node.js</span>
                                            <span className="text-surface-700">v20.x</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-surface-400">Database</span>
                                            <span className="text-surface-700">Appwrite Cloud</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-surface-400">Environment</span>
                                            <span className="text-surface-700">Development</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-surface-100">
                                    <Button>
                                        <Save size={16} /> Save Changes
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

function SettingToggle({
    label,
    description,
    defaultEnabled,
}: {
    label: string;
    description: string;
    defaultEnabled: boolean;
}) {
    const [enabled, setEnabled] = useState(defaultEnabled);

    return (
        <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl">
            <div>
                <p className="text-sm font-medium text-surface-800">{label}</p>
                <p className="text-xs text-surface-400 mt-0.5">{description}</p>
            </div>
            <button
                onClick={() => setEnabled(!enabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                    enabled ? 'bg-primary-600' : 'bg-surface-300'
                }`}
            >
                <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                />
            </button>
        </div>
    );
}
