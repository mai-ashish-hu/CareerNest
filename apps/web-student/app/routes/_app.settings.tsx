import { useState } from 'react';
import { Save, User, Bell, Shield } from 'lucide-react';
import { Button, Card, Input } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';

export const meta: MetaFunction = () => [{ title: 'Settings – Student – CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { user } = await requireUserSession(request);
    return json({ email: user.email || '' });
}

export default function Settings() {
    const { email } = useLoaderData<typeof loader>() as { email: string };
    const [activeSection, setActiveSection] = useState('account');
    const [showPassword, setShowPassword] = useState(false);

    const sections = [
        { id: 'account', label: 'Account', icon: <User size={18} /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
        { id: 'privacy', label: 'Privacy', icon: <Shield size={18} /> },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
                <p className="text-surface-500 mt-1">Manage your account preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="!p-2">
                        <nav className="space-y-1">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                                        activeSection === section.id
                                            ? 'bg-primary-50 text-primary-700'
                                            : 'text-surface-600 hover:bg-surface-50'
                                    }`}
                                >
                                    {section.icon}
                                    {section.label}
                                </button>
                            ))}
                        </nav>
                    </Card>
                </div>

                {/* Content */}
                <div className="lg:col-span-3">
                    {activeSection === 'account' && (
                        <Card>
                            <h3 className="font-semibold text-surface-900 mb-6">Account Settings</h3>
                            <form className="space-y-5">
                                <Input name="email" label="Email Address" defaultValue={email} type="email" disabled />
                                <p className="text-xs text-surface-400 -mt-3">Email is managed by your college. Contact TPO to change.</p>

                                <div className="border-t border-surface-100 pt-5">
                                    <h4 className="text-sm font-semibold text-surface-700 mb-4">Change Password</h4>
                                    <div className="space-y-4">
                                        <Input name="currentPassword" label="Current Password" type={showPassword ? 'text' : 'password'} placeholder="Enter current password" />
                                        <Input name="newPassword" label="New Password" type={showPassword ? 'text' : 'password'} placeholder="Enter new password" />
                                        <Input name="confirmPassword" label="Confirm New Password" type={showPassword ? 'text' : 'password'} placeholder="Confirm new password" />
                                        <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={showPassword}
                                                onChange={(e) => setShowPassword(e.target.checked)}
                                                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            Show passwords
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-surface-100">
                                    <Button><Save size={16} /> Update Password</Button>
                                </div>
                            </form>
                        </Card>
                    )}

                    {activeSection === 'notifications' && (
                        <Card>
                            <h3 className="font-semibold text-surface-900 mb-6">Notification Preferences</h3>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-4 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer">
                                    <div>
                                        <p className="text-sm font-medium text-surface-700">New Drive Notifications</p>
                                        <p className="text-xs text-surface-400">Get notified when new eligible drives are posted</p>
                                    </div>
                                    <input type="checkbox" defaultChecked className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 h-5 w-5" />
                                </label>
                                <label className="flex items-center justify-between p-4 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer">
                                    <div>
                                        <p className="text-sm font-medium text-surface-700">Application Status Updates</p>
                                        <p className="text-xs text-surface-400">Get notified when your application stage changes</p>
                                    </div>
                                    <input type="checkbox" defaultChecked className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 h-5 w-5" />
                                </label>
                                <label className="flex items-center justify-between p-4 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer">
                                    <div>
                                        <p className="text-sm font-medium text-surface-700">Announcements</p>
                                        <p className="text-xs text-surface-400">Get notified about placement cell announcements</p>
                                    </div>
                                    <input type="checkbox" defaultChecked className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 h-5 w-5" />
                                </label>
                                <label className="flex items-center justify-between p-4 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer">
                                    <div>
                                        <p className="text-sm font-medium text-surface-700">Drive Deadline Reminders</p>
                                        <p className="text-xs text-surface-400">Receive reminders before drive application deadlines</p>
                                    </div>
                                    <input type="checkbox" defaultChecked className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 h-5 w-5" />
                                </label>
                                <label className="flex items-center justify-between p-4 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer">
                                    <div>
                                        <p className="text-sm font-medium text-surface-700">Email Notifications</p>
                                        <p className="text-xs text-surface-400">Receive important updates via email</p>
                                    </div>
                                    <input type="checkbox" className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 h-5 w-5" />
                                </label>
                                <div className="flex justify-end pt-4 border-t border-surface-100">
                                    <Button><Save size={16} /> Save Preferences</Button>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeSection === 'privacy' && (
                        <Card>
                            <h3 className="font-semibold text-surface-900 mb-6">Privacy Settings</h3>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-4 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer">
                                    <div>
                                        <p className="text-sm font-medium text-surface-700">Profile Visible to Companies</p>
                                        <p className="text-xs text-surface-400">Allow companies to view your profile during drives</p>
                                    </div>
                                    <input type="checkbox" defaultChecked className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 h-5 w-5" />
                                </label>
                                <label className="flex items-center justify-between p-4 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer">
                                    <div>
                                        <p className="text-sm font-medium text-surface-700">Show Resume to Recruiters</p>
                                        <p className="text-xs text-surface-400">Allow recruiters to download your resume</p>
                                    </div>
                                    <input type="checkbox" defaultChecked className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 h-5 w-5" />
                                </label>
                                <label className="flex items-center justify-between p-4 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer">
                                    <div>
                                        <p className="text-sm font-medium text-surface-700">Show Contact Information</p>
                                        <p className="text-xs text-surface-400">Display your phone number and email to placement cell</p>
                                    </div>
                                    <input type="checkbox" defaultChecked className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 h-5 w-5" />
                                </label>
                                <div className="flex justify-end pt-4 border-t border-surface-100">
                                    <Button><Save size={16} /> Save Settings</Button>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
