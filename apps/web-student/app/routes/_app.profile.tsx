import { Card, Badge } from '@careernest/ui';
import { UserCircle, GraduationCap, Mail, Phone, MapPin, Calendar, Building2 } from 'lucide-react';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Profile – Student – CareerNest' }];

interface StudentProfile {
    name: string;
    email: string;
    department: string;
    enrollmentYear: number;
    phoneNumber: string;
    address: string;
    college: string;
    createdAt: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);

    const profileRes = await api.students.getMyProfile(token).catch(() => ({ data: null })) as { data: any };

    const profile: StudentProfile | null = profileRes.data ? {
        name: profileRes.data.name || '',
        email: profileRes.data.email || '',
        department: profileRes.data.department || '',
        enrollmentYear: profileRes.data.enrollmentYear ?? 0,
        phoneNumber: profileRes.data.phoneNumber ? String(profileRes.data.phoneNumber) : '',
        address: profileRes.data.address || '',
        college: typeof profileRes.data.colleges === 'object' ? profileRes.data.colleges?.name : '',
        createdAt: profileRes.data.$createdAt || '',
    } : null;

    return json({ profile, userEmail: user.email });
}

export default function Profile() {
    const { profile, userEmail } = useLoaderData<typeof loader>() as {
        profile: StudentProfile | null;
        userEmail: string;
    };

    if (!profile) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900">My Profile</h1>
                    <p className="text-surface-500 mt-1">Your student profile information</p>
                </div>
                <Card>
                    <div className="text-center py-12">
                        <UserCircle size={48} className="mx-auto text-surface-300 mb-4" />
                        <p className="text-surface-600 font-medium">Profile not found</p>
                        <p className="text-sm text-surface-400 mt-1">Your student profile has not been set up yet. Contact your placement cell.</p>
                    </div>
                </Card>
            </div>
        );
    }

    const p = profile;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-surface-900">My Profile</h1>
                <p className="text-surface-500 mt-1">Your academic and placement profile</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column – Profile Card */}
                <div className="space-y-6">
                    <Card>
                        <div className="text-center">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <span className="text-3xl font-bold text-white">{p.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <h3 className="text-lg font-bold text-surface-900">{p.name}</h3>
                            <p className="text-sm text-surface-500">{p.department}</p>
                            {p.college && (
                                <div className="flex items-center justify-center gap-1 mt-2 text-sm text-surface-500">
                                    <Building2 size={14} /> {p.college}
                                </div>
                            )}
                            <Badge variant="bg-primary-50 text-primary-700" className="mt-3">
                                Batch {p.enrollmentYear}
                            </Badge>
                        </div>

                        <div className="mt-6 pt-4 border-t border-surface-100 space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <Mail size={16} className="text-surface-400" />
                                <span className="text-surface-700">{p.email}</span>
                            </div>
                            {p.phoneNumber && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone size={16} className="text-surface-400" />
                                    <span className="text-surface-700">{p.phoneNumber}</span>
                                </div>
                            )}
                            {p.address && (
                                <div className="flex items-center gap-3 text-sm">
                                    <MapPin size={16} className="text-surface-400" />
                                    <span className="text-surface-700">{p.address}</span>
                                </div>
                            )}
                            {p.createdAt && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar size={16} className="text-surface-400" />
                                    <span className="text-surface-700">
                                        Joined {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Column – Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Academic Details */}
                    <Card>
                        <h3 className="font-semibold text-surface-900 flex items-center gap-2 mb-5">
                            <GraduationCap size={20} className="text-primary-600" /> Academic Information
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div>
                                <p className="text-xs text-surface-400 uppercase font-medium mb-1">Department</p>
                                <p className="font-medium text-surface-900">{p.department || '–'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-400 uppercase font-medium mb-1">Enrollment Year</p>
                                <p className="font-medium text-surface-900">{p.enrollmentYear || '–'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-400 uppercase font-medium mb-1">Email</p>
                                <p className="font-medium text-surface-900">{p.email}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Contact Information */}
                    <Card>
                        <h3 className="font-semibold text-surface-900 flex items-center gap-2 mb-5">
                            <UserCircle size={20} className="text-primary-600" /> Contact Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs text-surface-400 uppercase font-medium mb-1">Phone Number</p>
                                <p className="font-medium text-surface-900">{p.phoneNumber || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-400 uppercase font-medium mb-1">Address</p>
                                <p className="font-medium text-surface-900">{p.address || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-400 uppercase font-medium mb-1">College</p>
                                <p className="font-medium text-surface-900">{p.college || 'Not assigned'}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
