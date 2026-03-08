import { useState } from 'react';
import { Plus, GraduationCap, Users, Pencil, Trash2 } from 'lucide-react';
import { Button, Card, Badge, Modal, Input, Table, EmptyState } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Courses – College – CareerNest' }];

interface Course {
    id: string;
    name: string;
    department: string;
    duration: string;
    students: number;
    placedStudents: number;
}

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) throw redirect('/login');
    const tenantId = user.tenantId;

    const coursesRes = await api.courses.list(token, `tenantId=${tenantId}&limit=500`).catch(() => ({ data: [], total: 0 })) as { data: any[]; total: number };

    const courses: Course[] = (coursesRes.data || []).map((c: any) => ({
        id: c.$id || c.id || '',
        name: c.name || c.courseName || '',
        department: c.department || '',
        duration: c.duration || '',
        students: c.students ?? c.totalStudents ?? 0,
        placedStudents: c.placedStudents ?? 0,
    }));

    return json({ courses });
}

export default function Courses() {
    const { courses } = useLoaderData<typeof loader>() as { courses: Course[] };
    const [showModal, setShowModal] = useState(false);

    const columns = [
        {
            header: 'Course Name',
            accessor: (row: Course) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-50 text-primary-600"><GraduationCap size={16} /></div>
                    <span className="font-medium text-surface-900">{row.name}</span>
                </div>
            ),
        },
        {
            header: 'Department',
            accessor: (row: Course) => <Badge variant="bg-primary-50 text-primary-700">{row.department}</Badge>,
        },
        {
            header: 'Duration',
            accessor: (row: Course) => <span className="text-surface-600">{row.duration}</span>,
        },
        {
            header: 'Students',
            accessor: (row: Course) => <span className="font-semibold text-surface-700">{row.students}</span>,
            className: 'text-center',
        },
        {
            header: 'Placed',
            accessor: (row: Course) => (
                <div className="text-center">
                    <span className="font-semibold text-emerald-600">{row.placedStudents}</span>
                    <span className="text-surface-400 text-xs ml-1">({Math.round((row.placedStudents / row.students) * 100)}%)</span>
                </div>
            ),
            className: 'text-center',
        },
        {
            header: '',
            accessor: (row: Course) => (
                <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Edit">
                        <Pencil size={15} />
                    </button>
                    <button className="p-1.5 rounded-lg text-surface-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Delete">
                        <Trash2 size={15} />
                    </button>
                </div>
            ),
            className: 'w-20',
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900">Courses</h1>
                    <p className="text-surface-500 mt-1">Manage academic courses and departments</p>
                </div>
                <Button onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Add Course
                </Button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><GraduationCap size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{courses.length}</p>
                            <p className="text-xs text-surface-500">Total Courses</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Users size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{courses.reduce((a, c) => a + c.students, 0)}</p>
                            <p className="text-xs text-surface-500">Total Enrolled</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-50 text-purple-600"><Users size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{new Set(courses.map(c => c.department)).size}</p>
                            <p className="text-xs text-surface-500">Departments</p>
                        </div>
                    </div>
                </Card>
            </div>

            {courses.length > 0 ? (
                <Table columns={columns} data={courses} keyExtractor={(row) => row.id} />
            ) : (
                <Card>
                    <EmptyState
                        icon={<GraduationCap size={28} />}
                        title="No courses found"
                        description="Add your first course to get started."
                        action={<Button onClick={() => setShowModal(true)}><Plus size={16} /> Add Course</Button>}
                    />
                </Card>
            )}

            {/* Add Course Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Course">
                <form className="space-y-5">
                    <Input name="name" label="Course Name" placeholder="e.g., B.Tech Computer Science" required />
                    <div className="grid grid-cols-2 gap-4">
                        <Input name="department" label="Department" placeholder="e.g., CSE" required />
                        <div>
                            <label className="form-label">Duration</label>
                            <select className="form-input">
                                <option value="4">4 Years</option>
                                <option value="2">2 Years</option>
                                <option value="3">3 Years</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                        <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button type="submit">Add Course</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
