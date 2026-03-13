import { ArrowLeft, GraduationCap, Layers3, Users } from 'lucide-react';
import { Button, Card } from '@careernest/ui';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useLoaderData, useParams } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [
    { title: 'College Students - Super Admin - CareerNest' },
];

interface StudentRow {
    id: string;
    studentId: string;
    name: string;
    email: string;
    department: string;
    enrollmentYear: string;
}

function toPositiveInt(value: string | null, fallback: number): number {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const tenantId = params.id!;
    const url = new URL(request.url);
    const page = toPositiveInt(url.searchParams.get('page'), 1);
    const limit = 20;
    const department = (url.searchParams.get('department') || '').trim();

    const studentParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });

    if (department) {
        studentParams.set('department', department);
    }

    try {
        const [tenantRes, studentsRes, departmentsRes] = await Promise.all([
            api.tenants.getById(token, tenantId) as Promise<{ data: Record<string, unknown> }>,
            api.tenants.listStudents(token, tenantId, studentParams.toString()) as Promise<{
                data: Array<Record<string, unknown>>;
                total: number;
            }>,
            api.tenants.listDepartments(token, tenantId).catch(() => ({ data: [] })) as Promise<{ data: Array<Record<string, unknown>> }>,
        ]);

        const students: StudentRow[] = (studentsRes.data || []).map((student) => ({
            id: String(student.$id || ''),
            studentId: String(student.studentId || student.userid || student.$id || '-'),
            name: String(student.name || '-'),
            email: String(student.email || '-'),
            department: String(student.department || '-'),
            enrollmentYear: student.enrollmentYear ? String(student.enrollmentYear) : '-',
        }));

        const departments = [...new Set((departmentsRes.data || [])
            .map((departmentDoc) => String(departmentDoc.departmentName || '').trim())
            .filter(Boolean))]
            .sort((first, second) => first.localeCompare(second));

        return json({
            tenant: tenantRes.data,
            students,
            total: studentsRes.total || 0,
            page,
            limit,
            currentDepartment: department,
            departments,
        });
    } catch {
        throw new Response('Unable to load college students', { status: 404 });
    }
}

export default function TenantStudentsPage() {
    const { tenant, students, total, page, limit, currentDepartment, departments } = useLoaderData<typeof loader>();
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const params = useParams();
    const tenantId = String(tenant.$id || params.id || '');

    const getPageLink = (nextPage: number) => {
        const params = new URLSearchParams();
        if (currentDepartment) params.set('department', currentDepartment);
        params.set('page', String(nextPage));
        return `?${params.toString()}`;
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <Link
                            to={`/dashboard/tenants/${tenantId}`}
                            className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800"
                        >
                            <ArrowLeft size={16} />
                            Back to college
                        </Link>
                        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Students</h1>
                        <p className="mt-1 text-sm text-slate-600">
                            {String(tenant.collegeName || 'College')} • {total} student{total !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <MetricCard label="Departments" value={String(departments.length)} />
                        <MetricCard label="Students" value={String(total)} />
                    </div>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
                <Card className="p-0">
                    <div className="border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
                    </div>
                    <div className="space-y-4 p-6">
                        <Form method="get" className="space-y-4">
                            <div>
                                <label className="form-label">Department</label>
                                <select name="department" defaultValue={currentDepartment} className="form-input">
                                    <option value="">All Departments</option>
                                    {departments.map((department) => (
                                        <option key={department} value={department}>
                                            {department}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <input type="hidden" name="page" value="1" />
                            <Button type="submit" variant="secondary" className="w-full justify-center">
                                Apply Filter
                            </Button>
                        </Form>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm text-slate-600">Active filter</p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                                {currentDepartment || 'All departments'}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-0">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-semibold text-slate-900">Student List</h2>
                        <p className="text-sm text-slate-500">
                            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] bg-white">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200">
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Student ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Department</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Year</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.length > 0 ? (
                                    students.map((student) => (
                                        <tr key={student.id} className="border-b border-slate-100 last:border-0">
                                            <td className="px-6 py-4">
                                                <span className="inline-flex rounded-md bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                                                    {student.studentId}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{student.name}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{student.email}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                                    <Layers3 size={12} />
                                                    {student.department}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{student.enrollmentYear}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center">
                                            <Users size={32} className="mx-auto text-slate-300" />
                                            <h3 className="mt-4 text-base font-semibold text-slate-900">No students found</h3>
                                            <p className="mt-1 text-sm text-slate-500">
                                                No students match the selected filter.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                            <p className="text-sm text-slate-500">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                {page > 1 && (
                                    <Link
                                        to={getPageLink(page - 1)}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        Previous
                                    </Link>
                                )}
                                {page < totalPages && (
                                    <Link
                                        to={getPageLink(page + 1)}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        Next
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
    );
}
