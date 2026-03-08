import { useState } from 'react';
import { Save, Building2, Globe, Mail, Phone, Shield } from 'lucide-react';
import { Button, Card, Input, Textarea } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
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
            address: [college.address, college.city, college.state, college.pincode].filter(Boolean).join(', '),
            website: college.website || '',
            tpoName: college.tpoName || user.name || '',
            tpoEmail: college.tpoEmail || user.email || '',
            tpoPhone: college.tpoPhone || college.phone || '',
            placementEmail: college.placementEmail || '',
        },
    });
}

export default function Settings() {
    const { college } = useLoaderData<typeof loader>() as { college: Record<string, string> };
    const [activeSection, setActiveSection] = useState('general');

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
                    {activeSection === 'general' && (
                        <Card>
                            <h3 className="font-semibold text-surface-900 mb-6">General Information</h3>
                            <form className="space-y-5">
                                <Input name="collegeName" label="College Name" defaultValue={college.name} icon={<Building2 size={16} />} />
                                <Input name="subdomain" label="Subdomain" defaultValue={college.subdomain} icon={<Globe size={16} />} />
                                <Textarea name="address" label="Address" defaultValue={college.address} rows={3} />
                                <Input name="website" label="Website" defaultValue={college.website} icon={<Globe size={16} />} />
                                <div className="flex justify-end pt-4 border-t border-surface-100">
                                    <Button><Save size={16} /> Save Changes</Button>
                                </div>
                            </form>
                        </Card>
                    )}

                    {activeSection === 'contact' && (
                        <Card>
                            <h3 className="font-semibold text-surface-900 mb-6">Contact Information</h3>
                            <form className="space-y-5">
                                <Input name="tpoName" label="TPO Name" defaultValue={college.tpoName} />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input name="tpoEmail" label="TPO Email" defaultValue={college.tpoEmail} icon={<Mail size={16} />} type="email" />
                                    <Input name="tpoPhone" label="TPO Phone" defaultValue={college.tpoPhone} icon={<Phone size={16} />} />
                                </div>
                                <Input name="placementEmail" label="Placement Cell Email" defaultValue={college.placementEmail} icon={<Mail size={16} />} type="email" />
                                <div className="flex justify-end pt-4 border-t border-surface-100">
                                    <Button><Save size={16} /> Save Changes</Button>
                                </div>
                            </form>
                        </Card>
                    )}

                    {activeSection === 'placement' && (
                        <Card>
                            <h3 className="font-semibold text-surface-900 mb-6">Placement Rules</h3>
                            <form className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input name="maxOffers" label="Max Offers per Student" defaultValue="2" type="number" />
                                    <Input name="minCGPA" label="Minimum CGPA for Eligibility" defaultValue="6.0" type="number" step="0.1" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input name="maxBacklogs" label="Max Allowed Backlogs" defaultValue="1" type="number" />
                                    <Input name="dreamCtc" label="Dream Company CTC Threshold (₹)" defaultValue="1000000" type="number" />
                                </div>
                                <div className="space-y-3">
                                    <label className="form-label">Placement Policies</label>
                                    <label className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer">
                                        <input type="checkbox" defaultChecked className="rounded border-surface-300 text-primary-600 focus:ring-primary-500" />
                                        <div>
                                            <p className="text-sm font-medium text-surface-700">Allow students to apply after placement</p>
                                            <p className="text-xs text-surface-400">Students can apply to dream companies even after being placed</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer">
                                        <input type="checkbox" defaultChecked className="rounded border-surface-300 text-primary-600 focus:ring-primary-500" />
                                        <div>
                                            <p className="text-sm font-medium text-surface-700">Auto-verify eligibility</p>
                                            <p className="text-xs text-surface-400">Automatically check eligibility criteria before allowing application</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer">
                                        <input type="checkbox" className="rounded border-surface-300 text-primary-600 focus:ring-primary-500" />
                                        <div>
                                            <p className="text-sm font-medium text-surface-700">Require resume upload</p>
                                            <p className="text-xs text-surface-400">Students must upload their resume before applying to any drive</p>
                                        </div>
                                    </label>
                                </div>
                                <div className="flex justify-end pt-4 border-t border-surface-100">
                                    <Button><Save size={16} /> Save Changes</Button>
                                </div>
                            </form>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
