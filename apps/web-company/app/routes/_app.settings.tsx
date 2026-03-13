import { useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
    BadgeCheck,
    Briefcase,
    Building2,
    CheckCircle2,
    Mail,
    Phone,
    ShieldCheck,
    User,
} from 'lucide-react';
import { Badge, Card, EmptyState } from '@careernest/ui';
import {
    loadCompanyDrives,
    loadDriveApplicationSummaries,
    requireCompanyContext,
} from '~/utils/company.server';
import { formatSalaryDisplay } from '~/utils/company.shared';

export const meta: MetaFunction = () => [{ title: 'Settings - Company Portal - CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user, company } = await requireCompanyContext(request);
    const drives = await loadCompanyDrives(token, user, company);
    const summaries = await loadDriveApplicationSummaries(token, drives);

    const totalApplications = drives.reduce((sum, drive) => sum + (summaries[drive.id]?.total || 0), 0);
    const selectedCandidates = drives.reduce((sum, drive) => sum + (summaries[drive.id]?.selected || 0), 0);
    const activeDrives = drives.filter((drive) => drive.status === 'active').length;
    const departments = [...new Set(drives.flatMap((drive) => drive.department))].slice(0, 8);
    const averageSalary = drives.length > 0
        ? Math.round(drives.reduce((sum, drive) => sum + drive.salary, 0) / drives.length)
        : 0;

    return json({
        company,
        stats: {
            activeDrives,
            totalApplications,
            selectedCandidates,
            averageSalary,
        },
        departments,
    });
}

export default function CompanySettings() {
    const { company, stats, departments } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-600">Company Profile</p>
                <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
                <p className="mt-1 text-surface-500">Reference details for your verified organization profile in CareerNest.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-50 p-2 text-blue-600"><Briefcase size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{stats.activeDrives}</p>
                            <p className="text-xs text-surface-500">Active Drives</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-primary-50 p-2 text-primary-600"><Building2 size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{stats.totalApplications}</p>
                            <p className="text-xs text-surface-500">Applications Received</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><CheckCircle2 size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{stats.selectedCandidates}</p>
                            <p className="text-xs text-surface-500">Selections</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-amber-50 p-2 text-amber-600"><BadgeCheck size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{formatSalaryDisplay(stats.averageSalary, 'annual')}</p>
                            <p className="text-xs text-surface-500">Average Published CTC</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr,1fr]">
                <Card>
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-surface-900">Verified Company Details</h2>
                            <p className="text-sm text-surface-500">This profile is used to identify your drives across the portal.</p>
                        </div>
                        <Badge variant={company.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-600'}>
                            {company.status}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-surface-100 p-4">
                            <p className="text-xs uppercase tracking-wide text-surface-400">Company Name</p>
                            <p className="mt-2 font-semibold text-surface-900">{company.name}</p>
                        </div>
                        <div className="rounded-2xl border border-surface-100 p-4">
                            <p className="text-xs uppercase tracking-wide text-surface-400">Contact Person</p>
                            <p className="mt-2 flex items-center gap-2 font-semibold text-surface-900">
                                <User size={15} className="text-surface-400" />
                                {company.contactPerson || 'Not provided'}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-surface-100 p-4">
                            <p className="text-xs uppercase tracking-wide text-surface-400">Contact Email</p>
                            <p className="mt-2 flex items-center gap-2 font-semibold text-surface-900">
                                <Mail size={15} className="text-surface-400" />
                                {company.contactEmail || 'Not provided'}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-surface-100 p-4">
                            <p className="text-xs uppercase tracking-wide text-surface-400">Contact Phone</p>
                            <p className="mt-2 flex items-center gap-2 font-semibold text-surface-900">
                                <Phone size={15} className="text-surface-400" />
                                {company.contactPhone || 'Not provided'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                        Placement cell administrators own company profile changes. If your contact details need correction, reach out to the college placement team.
                    </div>
                </Card>

                <Card>
                    <div className="mb-5">
                        <h2 className="text-lg font-semibold text-surface-900">Hiring Snapshot</h2>
                        <p className="text-sm text-surface-500">Signals pulled from your currently published drives.</p>
                    </div>

                    {departments.length > 0 ? (
                        <div className="space-y-5">
                            <div>
                                <p className="mb-2 text-xs uppercase tracking-wide text-surface-400">Target Departments</p>
                                <div className="flex flex-wrap gap-2">
                                    {departments.map((department) => (
                                        <Badge key={department} variant="bg-primary-50 text-primary-700">{department}</Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-surface-100 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-surface-900">Profile visibility</p>
                                        <p className="mt-1 text-sm text-surface-500">
                                            Your account is operating under the <span className="font-semibold text-surface-700">{company.status}</span> profile state, so students only see drives tied to this verified company record.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <EmptyState
                            icon={<Building2 size={28} />}
                            title="No drive settings yet"
                            description="Publish a drive to start building your hiring footprint and eligibility preferences."
                        />
                    )}
                </Card>
            </div>
        </div>
    );
}
