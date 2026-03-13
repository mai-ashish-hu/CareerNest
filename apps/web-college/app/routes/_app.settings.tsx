import { useState } from 'react';
import { Save, Building2, Globe, Mail, Phone, Shield, CheckCircle2 } from 'lucide-react';
import { Button, Card, Input, Textarea } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, useActionData, useNavigation, Form } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Settings – College – CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) throw redirect('/login');
    const tenantId = user.tenantId;

    const tenantRes = await api.tenants.getById(token, tenantId).catch(() => ({ data: {} })) as { data: any };
    const college = tenantRes.data || {};

    return json({
        college: {
            name: college.collegeName || college.name || '',
            subdomain: college.subdomain || '',
            address: college.address || '',
            city: college.city || '',
            state: college.state || '',
            pincode: college.pincode || '',
            website: college.website || '',
            tpoName: college.tpoName || user.name || '',
            tpoEmail: college.tpoEmail || user.email || '',
            tpoPhone: college.tpoPhone || college.phone || '',
            placementEmail: college.placementEmail || '',
        },
        userRole: user.role,
        tenantId,
    });
}

type ActionData = { success?: boolean; error?: string };

export async function action({ request }: ActionFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    if (user.role !== 'tpo' || !user.tenantId) {
        return json<ActionData>({ error: 'Only TPOs can update settings.' }, { status: 403 });
    }

    const formData = await request.formData();
    const section = formData.get('_section');

    const updateData: Record<string, unknown> = {};

    if (section === 'general') {
        const collegeName = String(formData.get('collegeName') || '').trim();
        if (!collegeName) return json<ActionData>({ error: 'College name is required.' }, { status: 400 });
        updateData.collegeName = collegeName;
        updateData.subdomain = String(formData.get('subdomain') || '').trim();
        updateData.address = String(formData.get('address') || '').trim();
        updateData.website = String(formData.get('website') || '').trim();
    } else if (section === 'contact') {
        updateData.tpoName = String(formData.get('tpoName') || '').trim();
        updateData.tpoEmail = String(formData.get('tpoEmail') || '').trim();
        updateData.tpoPhone = String(formData.get('tpoPhone') || '').trim();
        updateData.placementEmail = String(formData.get('placementEmail') || '').trim();
    } else if (section === 'placement') {
        updateData.maxOffers = Number(formData.get('maxOffers') || 2);
        updateData.minCGPA = Number(formData.get('minCGPA') || 6.0);
        updateData.maxBacklogs = Number(formData.get('maxBacklogs') || 1);
        updateData.dreamCtc = Number(formData.get('dreamCtc') || 1000000);
    } else {
        return json<ActionData>({ error: 'Unknown settings section.' }, { status: 400 });
    }

    try {
        await api.tenants.update(token, user.tenantId, updateData);
        return json<ActionData>({ success: true });
    } catch (err: any) {
        return json<ActionData>({ error: err?.message || 'Failed to save settings.' }, { status: 500 });
    }
}

export default function Settings() {
    const { college, userRole } = useLoaderData<typeof loader>() as { college: Record<string, string>; userRole: string };
    const actionData = useActionData<typeof action>() as ActionData | undefined;
    const navigation = useNavigation();
    const isSaving = navigation.state === 'submitting';
    const [activeSection, setActiveSection] = useState('general');
    const isTPO = userRole === 'tpo';

    const sections = [
        { id: 'general', label: 'General', icon: <Building2 size={18} /> },
        { id: 'contact', label: 'Contact Info', icon: <Mail size={18} /> },
        { id: 'placement', label: 'Placement Rules', icon: <Shield size={18} /> },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
                <p className="text-surface-500 mt-1">Manage your college portal settings</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Nav */}
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
                    {/* Feedback */}
                    {actionData?.success && (
                        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                            <CheckCircle2 size={16} /> Settings saved successfully.
                        </div>
                    )}
                    {actionData?.error && (
                        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                            {actionData.error}
                        </div>
                    )}

                    {activeSection === 'general' && (
                        <Card>
                            <h3 className="font-semibold text-surface-900 mb-6">General Information</h3>
                            <Form method="post" className="space-y-5">
                                <input type="hidden" name="_section" value="general" />
                                <Input name="collegeName" label="College Name" defaultValue={college.name} icon={<Building2 size={16} />} disabled={!isTPO} />
                                <Input name="subdomain" label="Subdomain" defaultValue={college.subdomain} icon={<Globe size={16} />} disabled={!isTPO} />
                                <Textarea name="address" label="Address" defaultValue={college.address} rows={3} disabled={!isTPO} />
                                <Input name="website" label="Website" defaultValue={college.website} icon={<Globe size={16} />} disabled={!isTPO} />
                                {isTPO && (
                                    <div className="flex justify-end pt-4 border-t border-surface-100">
                                        <Button type="submit" isLoading={isSaving}><Save size={16} /> Save Changes</Button>
                                    </div>
                                )}
                            </Form>
                        </Card>
                    )}

                    {activeSection === 'contact' && (
                        <Card>
                            <h3 className="font-semibold text-surface-900 mb-6">Contact Information</h3>
                            <Form method="post" className="space-y-5">
                                <input type="hidden" name="_section" value="contact" />
                                <Input name="tpoName" label="TPO Name" defaultValue={college.tpoName} disabled={!isTPO} />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input name="tpoEmail" label="TPO Email" defaultValue={college.tpoEmail} icon={<Mail size={16} />} type="email" disabled={!isTPO} />
                                    <Input name="tpoPhone" label="TPO Phone" defaultValue={college.tpoPhone} icon={<Phone size={16} />} disabled={!isTPO} />
                                </div>
                                <Input name="placementEmail" label="Placement Cell Email" defaultValue={college.placementEmail} icon={<Mail size={16} />} type="email" disabled={!isTPO} />
                                {isTPO && (
                                    <div className="flex justify-end pt-4 border-t border-surface-100">
                                        <Button type="submit" isLoading={isSaving}><Save size={16} /> Save Changes</Button>
                                    </div>
                                )}
                            </Form>
                        </Card>
                    )}

                    {activeSection === 'placement' && (
                        <Card>
                            <h3 className="font-semibold text-surface-900 mb-6">Placement Rules</h3>
                            <Form method="post" className="space-y-5">
                                <input type="hidden" name="_section" value="placement" />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input name="maxOffers" label="Max Offers per Student" defaultValue="2" type="number" disabled={!isTPO} />
                                    <Input name="minCGPA" label="Minimum CGPA for Eligibility" defaultValue="6.0" type="number" step="0.1" disabled={!isTPO} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input name="maxBacklogs" label="Max Allowed Backlogs" defaultValue="1" type="number" disabled={!isTPO} />
                                    <Input name="dreamCtc" label="Dream Company CTC Threshold" defaultValue="1000000" type="number" disabled={!isTPO} />
                                </div>
                                {isTPO && (
                                    <div className="flex justify-end pt-4 border-t border-surface-100">
                                        <Button type="submit" isLoading={isSaving}><Save size={16} /> Save Changes</Button>
                                    </div>
                                )}
                            </Form>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
