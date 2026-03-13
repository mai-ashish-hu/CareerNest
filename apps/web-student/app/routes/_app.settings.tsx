import { useState, useEffect, useCallback } from 'react';
import { Save, User, Bell, Shield, CheckCircle2, Info } from 'lucide-react';
import { Button, Card, Input } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useActionData, useNavigation, Form } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { StudentMetricCard, StudentMetricGrid, StudentPageHero } from '~/components/StudentPageHero';

export const meta: MetaFunction = () => [{ title: 'Settings – Student – CareerNest' }];

type ActionData = { success?: boolean; error?: string };

export async function loader({ request }: LoaderFunctionArgs) {
    const { user } = await requireUserSession(request);
    return json({ email: user.email || '' });
}

export async function action({ request }: ActionFunctionArgs) {
    const { token } = await requireUserSession(request);
    const formData = await request.formData();
    const intent = formData.get('intent');

    if (intent === 'changePassword') {
        const currentPassword = String(formData.get('currentPassword') || '');
        const newPassword = String(formData.get('newPassword') || '');
        const confirmPassword = String(formData.get('confirmPassword') || '');

        if (!currentPassword || !newPassword) {
            return json<ActionData>({ error: 'Please fill in all password fields.' }, { status: 400 });
        }
        if (newPassword.length < 8) {
            return json<ActionData>({ error: 'New password must be at least 8 characters.' }, { status: 400 });
        }
        if (newPassword !== confirmPassword) {
            return json<ActionData>({ error: 'New passwords do not match.' }, { status: 400 });
        }

        try {
            const apiUrl = process.env.API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/v1/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                return json<ActionData>({ error: data?.error?.message || 'Unable to change password.' }, { status: 400 });
            }
            return json<ActionData>({ success: true });
        } catch {
            return json<ActionData>({ error: 'Unable to connect to server.' }, { status: 500 });
        }
    }

    return json<ActionData>({ error: 'Unknown action.' }, { status: 400 });
}

export default function Settings() {
    const { email } = useLoaderData<typeof loader>() as { email: string };
    const actionData = useActionData<typeof action>() as ActionData | undefined;
    const navigation = useNavigation();
    const isSaving = navigation.state === 'submitting';
    const [activeSection, setActiveSection] = useState('account');
    const [showPassword, setShowPassword] = useState(false);

    const sections = [
        { id: 'account', label: 'Account', icon: <User size={18} /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
        { id: 'privacy', label: 'Privacy', icon: <Shield size={18} /> },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <StudentPageHero
                tone="sky"
                badge="Account control"
                title="Settings that stay simple and student-friendly"
                description="Manage account access, password updates, privacy expectations, and notification preferences from one clear workspace."
                aside={
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                                Managed by college
                            </p>
                            <p className="mt-2 text-2xl font-bold text-white">Email locked</p>
                            <p className="mt-2 text-sm leading-6 text-white/75">
                                Your email is tied to your institution record, so only password and local preferences are editable here.
                            </p>
                        </div>
                    </div>
                }
            />

            <StudentMetricGrid className="xl:grid-cols-3">
                <StudentMetricCard
                    label="Account Email"
                    value={email || 'Not available'}
                    hint="Managed centrally by your college placement team."
                    icon={<User size={20} />}
                    tone="sky"
                />
                <StudentMetricCard
                    label="Password"
                    value="Protected"
                    hint="Update it here whenever you need a security refresh."
                    icon={<Shield size={20} />}
                    tone="emerald"
                />
                <StudentMetricCard
                    label="Preferences"
                    value="Local"
                    hint="Notification and privacy switches stay grouped here."
                    icon={<Bell size={20} />}
                    tone="ink"
                />
            </StudentMetricGrid>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Settings Nav */}
                <div className="lg:col-span-1">
                    <Card className="student-surface-card !p-2">
                        <nav className="flex lg:flex-col gap-1 overflow-x-auto">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
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
                        <Card className="student-surface-card">
                            <h3 className="font-semibold text-surface-900 mb-6">Account Settings</h3>

                            {actionData?.success && (
                                <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                                    <CheckCircle2 size={16} /> Password updated successfully.
                                </div>
                            )}
                            {actionData?.error && (
                                <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                                    {actionData.error}
                                </div>
                            )}

                            <div className="space-y-5">
                                <Input name="email" label="Email Address" defaultValue={email} type="email" disabled />
                                <p className="text-xs text-surface-400 -mt-3">Email is managed by your college. Contact TPO to change.</p>

                                <div className="border-t border-surface-100 pt-5">
                                    <h4 className="text-sm font-semibold text-surface-700 mb-4">Change Password</h4>
                                    <Form method="post" className="space-y-4">
                                        <input type="hidden" name="intent" value="changePassword" />
                                        <Input name="currentPassword" label="Current Password" type={showPassword ? 'text' : 'password'} placeholder="Enter current password" required autoComplete="current-password" />
                                        <Input name="newPassword" label="New Password" type={showPassword ? 'text' : 'password'} placeholder="Enter new password (min 8 chars)" required autoComplete="new-password" />
                                        <Input name="confirmPassword" label="Confirm New Password" type={showPassword ? 'text' : 'password'} placeholder="Confirm new password" required autoComplete="new-password" />
                                        <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={showPassword}
                                                onChange={(e) => setShowPassword(e.target.checked)}
                                                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            Show passwords
                                        </label>
                                        <div className="flex justify-end pt-4 border-t border-surface-100">
                                            <Button type="submit" isLoading={isSaving}><Save size={16} /> Update Password</Button>
                                        </div>
                                    </Form>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeSection === 'notifications' && (
                        <NotificationPreferences />
                    )}

                    {activeSection === 'privacy' && (
                        <PrivacyPreferences />
                    )}
                </div>
            </div>
        </div>
    );
}

const NOTIF_STORAGE_KEY = 'careernest_notification_prefs';
const PRIVACY_STORAGE_KEY = 'careernest_privacy_prefs';

interface NotifPrefs {
    newDrives: boolean;
    statusUpdates: boolean;
    announcements: boolean;
    deadlineReminders: boolean;
    emailNotifications: boolean;
}

const defaultNotifPrefs: NotifPrefs = {
    newDrives: true,
    statusUpdates: true,
    announcements: true,
    deadlineReminders: true,
    emailNotifications: false,
};

function useLocalPrefs<T>(key: string, defaults: T): [T, (prefs: T) => void, boolean] {
    const [prefs, setPrefs] = useState<T>(defaults);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(key);
            if (stored) setPrefs(JSON.parse(stored));
        } catch { /* ignore */ }
    }, [key]);

    const save = useCallback((newPrefs: T) => {
        setPrefs(newPrefs);
        localStorage.setItem(key, JSON.stringify(newPrefs));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }, [key]);

    return [prefs, save, saved];
}

function NotificationPreferences() {
    const [prefs, save, saved] = useLocalPrefs<NotifPrefs>(NOTIF_STORAGE_KEY, defaultNotifPrefs);
    const [local, setLocal] = useState<NotifPrefs>(prefs);

    useEffect(() => { setLocal(prefs); }, [prefs]);

    const toggle = (key: keyof NotifPrefs) => setLocal((p) => ({ ...p, [key]: !p[key] }));

    const items: { key: keyof NotifPrefs; label: string; desc: string }[] = [
        { key: 'newDrives', label: 'New Drive Notifications', desc: 'Get notified when new eligible drives are posted' },
        { key: 'statusUpdates', label: 'Application Status Updates', desc: 'Get notified when your application stage changes' },
        { key: 'announcements', label: 'Announcements', desc: 'Get notified about placement cell announcements' },
        { key: 'deadlineReminders', label: 'Drive Deadline Reminders', desc: 'Receive reminders before drive application deadlines' },
        { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive important updates via email' },
    ];

    return (
        <Card className="student-surface-card">
            <h3 className="font-semibold text-surface-900 mb-2">Notification Preferences</h3>
            <p className="text-xs text-surface-400 mb-5 flex items-center gap-1.5">
                <Info size={12} /> Preferences are stored locally on this device.
            </p>
            {saved && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                    <CheckCircle2 size={16} /> Preferences saved.
                </div>
            )}
            <div className="space-y-4">
                {items.map((item) => (
                    <label key={item.key} className="flex items-center justify-between p-4 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer">
                        <div>
                            <p className="text-sm font-medium text-surface-700">{item.label}</p>
                            <p className="text-xs text-surface-400">{item.desc}</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={local[item.key]}
                            onChange={() => toggle(item.key)}
                            className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
                        />
                    </label>
                ))}
                <div className="flex justify-end pt-4 border-t border-surface-100">
                    <Button type="button" onClick={() => save(local)}><Save size={16} /> Save Preferences</Button>
                </div>
            </div>
        </Card>
    );
}

interface PrivacyPrefs {
    profileVisible: boolean;
    showResume: boolean;
    showContact: boolean;
}

const defaultPrivacyPrefs: PrivacyPrefs = {
    profileVisible: true,
    showResume: true,
    showContact: true,
};

function PrivacyPreferences() {
    const [prefs, save, saved] = useLocalPrefs<PrivacyPrefs>(PRIVACY_STORAGE_KEY, defaultPrivacyPrefs);
    const [local, setLocal] = useState<PrivacyPrefs>(prefs);

    useEffect(() => { setLocal(prefs); }, [prefs]);

    const toggle = (key: keyof PrivacyPrefs) => setLocal((p) => ({ ...p, [key]: !p[key] }));

    const items: { key: keyof PrivacyPrefs; label: string; desc: string }[] = [
        { key: 'profileVisible', label: 'Profile Visible to Companies', desc: 'Allow companies to view your profile during drives' },
        { key: 'showResume', label: 'Show Resume to Recruiters', desc: 'Allow recruiters to download your resume' },
        { key: 'showContact', label: 'Show Contact Information', desc: 'Display your phone number and email to placement cell' },
    ];

    return (
        <Card className="student-surface-card">
            <h3 className="font-semibold text-surface-900 mb-2">Privacy Settings</h3>
            <p className="text-xs text-surface-400 mb-5 flex items-center gap-1.5">
                <Info size={12} /> Preferences are stored locally on this device.
            </p>
            {saved && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                    <CheckCircle2 size={16} /> Settings saved.
                </div>
            )}
            <div className="space-y-4">
                {items.map((item) => (
                    <label key={item.key} className="flex items-center justify-between p-4 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer">
                        <div>
                            <p className="text-sm font-medium text-surface-700">{item.label}</p>
                            <p className="text-xs text-surface-400">{item.desc}</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={local[item.key]}
                            onChange={() => toggle(item.key)}
                            className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
                        />
                    </label>
                ))}
                <div className="flex justify-end pt-4 border-t border-surface-100">
                    <Button type="button" onClick={() => save(local)}><Save size={16} /> Save Settings</Button>
                </div>
            </div>
        </Card>
    );
}
