import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Users, GraduationCap, Download, Eye, Upload, UserPlus, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Card, Badge, Table, EmptyState, Avatar, Tabs, Button, Modal, Input } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Students – College – CareerNest' }];

interface Department {
    id: string;
    name: string;
}

interface Student {
    id: string;
    studentId: string;
    name: string;
    email: string;
    department: string;
    departmentId: string;
    enrollmentYear: number;
    phoneNumber: number;
    address: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) throw redirect('/login');
    const tenantId = user.tenantId;

    const [studentsRes, departmentsRes] = await Promise.all([
        api.students.list(token, `tenantId=${tenantId}&limit=500`).catch(() => ({ data: [], total: 0 })) as Promise<{ data: any[]; total: number }>,
        api.tenants.listDepartments(token, tenantId).catch(() => ({ data: [] })) as Promise<{ data: any[] }>,
    ]);

    const departments: Department[] = (departmentsRes.data || []).map((d: any) => ({
        id: d.$id || d.id || '',
        name: d.departmentName || d.name || '',
    }));

    const students: Student[] = ((studentsRes.data || []).map((s: any) => {
        const dept = s.departements || s.departments || s.department;
        let departmentName = '';
        let departmentId = '';
        if (typeof dept === 'object' && dept !== null) {
            departmentName = dept.departmentName || dept.name || '';
            departmentId = dept.$id || '';
        } else if (typeof dept === 'string') {
            departmentName = dept;
            departmentId = dept;
        }

        return {
            id: s.$id || s.id || '',
            studentId: s.$id || s.id || '',
            name: s.name || '',
            email: s.email || '',
            department: departmentName,
            departmentId,
            enrollmentYear: s.enrollmentYear ?? 0,
            phoneNumber: s.phoneNumber ?? 0,
            address: s.address || '',
        };
    }) as Student[]).filter((s: Student) => {
        // TPO_ASSISTANT can only see students in their own department
        if (user.role === 'tpo_assistant' && user.department) {
            return s.department === user.department || s.departmentId === user.department;
        }
        return true;
    });

    return json({ students, departments });
}

export async function action({ request }: ActionFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) return json({ error: 'Unauthorized' }, { status: 403 });

    const form = await request.formData();
    const intent = form.get('intent') as string;

    if (intent === 'single') {
        const payload = {
            studentId: form.get('studentId') as string,
            password: form.get('password') as string,
            name: form.get('name') as string,
            email: form.get('email') as string,
            department: form.get('department') as string,
            enrollmentYear: Number(form.get('enrollmentYear')),
            phoneNumber: Number(form.get('phoneNumber')),
            address: form.get('address') as string,
        };
        try {
            await api.students.create(token, payload);
            return json({ success: true });
        } catch (err: any) {
            return json({ error: err?.message || 'Failed to add student' }, { status: 500 });
        }
    }

    if (intent === 'bulk') {
        const csvData = form.get('csvData') as string;
        if (!csvData) return json({ error: 'No CSV data provided' }, { status: 400 });

        try {
            const lines = csvData.trim().split('\n');
            const header = lines[0].split(',').map(h => h.trim().toLowerCase());

            const requiredCols = ['studentid', 'password', 'name', 'email', 'department', 'enrollmentyear', 'phonenumber', 'address'];
            const missing = requiredCols.filter(c => !header.includes(c));
            if (missing.length > 0) return json({ error: `Missing CSV columns: ${missing.join(', ')}` }, { status: 400 });

            const students = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const values = line.split(',').map(v => v.trim());
                const row: Record<string, string> = {};
                header.forEach((h, idx) => { row[h] = values[idx] || ''; });

                students.push({
                    studentId: row['studentid'],
                    password: row['password'],
                    name: row['name'],
                    email: row['email'],
                    department: row['department'],
                    enrollmentYear: Number(row['enrollmentyear']),
                    phoneNumber: Number(row['phonenumber']),
                    address: row['address'],
                });
            }

            if (students.length === 0) return json({ error: 'No student rows found in CSV' }, { status: 400 });

            const result = await api.students.bulkCreate(token, { students }) as any;
            return json({
                success: true,
                bulkResult: {
                    total: students.length,
                    succeeded: result?.data?.success?.length ?? 0,
                    failed: result?.data?.failed ?? [],
                },
            });
        } catch (err: any) {
            return json({ error: err?.message || 'Failed to process CSV' }, { status: 500 });
        }
    }

    return json({ error: 'Invalid intent' }, { status: 400 });
}

export default function Students() {
    const { students, departments } = useLoaderData<typeof loader>() as { students: Student[]; departments: Department[] };
    const fetcher = useFetcher<{ success?: boolean; error?: string; bulkResult?: { total: number; succeeded: number; failed: { email: string; error: string }[] } }>();
    const [showModal, setShowModal] = useState(false);
    const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [csvData, setCsvData] = useState('');
    const [csvFileName, setCsvFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (fetcher.data?.success && !fetcher.data?.bulkResult) {
            setShowModal(false);
        }
    }, [fetcher.data]);

    const filtered = students.filter((s) => {
        const q = searchQuery.toLowerCase();
        const matchSearch = s.name.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q) ||
            s.studentId.toLowerCase().includes(q) ||
            s.department.toLowerCase().includes(q);
        const matchDept = !deptFilter || s.departmentId === deptFilter || s.department === deptFilter;
        return matchSearch && matchDept;
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCsvFileName(file.name);
        const reader = new FileReader();
        reader.onload = (evt) => {
            setCsvData(evt.target?.result as string || '');
        };
        reader.readAsText(file);
    };

    const columns = [
        {
            header: 'Student',
            accessor: (row: Student) => (
                <div className="flex items-center gap-3">
                    <Avatar name={row.name} size="sm" />
                    <div>
                        <p className="font-medium text-surface-900">{row.name}</p>
                        <p className="text-xs text-surface-400">{row.studentId} • {row.email}</p>
                    </div>
                </div>
            ),
        },
        {
            header: 'Department',
            accessor: (row: Student) => (
                <Badge variant="bg-primary-50 text-primary-700">{row.department || '—'}</Badge>
            ),
        },
        {
            header: 'Year',
            accessor: (row: Student) => (
                <span className="text-surface-600 font-medium">{row.enrollmentYear}</span>
            ),
            className: 'text-center',
        },
        {
            header: 'Phone',
            accessor: (row: Student) => (
                <span className="text-surface-600 text-sm">{row.phoneNumber || '—'}</span>
            ),
        },
        {
            header: 'Address',
            accessor: (row: Student) => (
                <span className="text-surface-500 text-sm truncate max-w-[180px] block">{row.address || '—'}</span>
            ),
        },
        {
            header: '',
            accessor: (row: Student) => (
                <button className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="View Profile">
                    <Eye size={15} />
                </button>
            ),
            className: 'w-12',
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900">Students</h1>
                    <p className="text-surface-500 mt-1">View and manage student profiles</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary">
                        <Download size={16} /> Export
                    </Button>
                    <Button onClick={() => { setShowModal(true); setAddMode('single'); }}>
                        <Plus size={18} /> Add Student
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Users size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{students.length}</p>
                            <p className="text-xs text-surface-500">Total Students</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-50 text-purple-600"><GraduationCap size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{new Set(students.map(s => s.department)).size}</p>
                            <p className="text-xs text-surface-500">Departments</p>
                        </div>
                    </div>
                </Card>
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Users size={18} /></div>
                        <div>
                            <p className="text-2xl font-bold text-surface-900">{new Set(students.map(s => s.enrollmentYear)).size}</p>
                            <p className="text-xs text-surface-500">Batches</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Search & Filters */}
            <Card className="!p-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                        <input
                            type="text"
                            placeholder="Search by student ID, name, email or department..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <select
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                        className="form-input w-48 !py-2.5"
                    >
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
            </Card>

            {/* Table */}
            {filtered.length > 0 ? (
                <Table columns={columns} data={filtered} keyExtractor={(row) => row.id} />
            ) : (
                <Card>
                    <EmptyState
                        icon={<Users size={28} />}
                        title="No students found"
                        description={searchQuery || deptFilter ? 'Try adjusting your search or filters.' : 'Add your first student to get started.'}
                        action={!searchQuery && !deptFilter ? <Button onClick={() => { setShowModal(true); setAddMode('single'); }}><Plus size={16} /> Add Student</Button> : undefined}
                    />
                </Card>
            )}

            {/* Add Student Modal */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setCsvData(''); setCsvFileName(''); }} title="Add Students" size="lg">
                {/* Mode Tabs */}
                <div className="flex border-b border-surface-100 mb-5">
                    <button
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${addMode === 'single' ? 'border-primary-600 text-primary-700' : 'border-transparent text-surface-400 hover:text-surface-600'}`}
                        onClick={() => setAddMode('single')}
                    >
                        <UserPlus size={16} /> Single Student
                    </button>
                    <button
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${addMode === 'bulk' ? 'border-primary-600 text-primary-700' : 'border-transparent text-surface-400 hover:text-surface-600'}`}
                        onClick={() => setAddMode('bulk')}
                    >
                        <FileSpreadsheet size={16} /> Bulk Upload (CSV)
                    </button>
                </div>

                {/* Single Student Form */}
                {addMode === 'single' && (
                    <fetcher.Form method="post" className="space-y-4">
                        <input type="hidden" name="intent" value="single" />
                        <div className="grid grid-cols-2 gap-4">
                            <Input name="studentId" label="Student ID (PRN / Registration No.)" placeholder="e.g., 22CSE001" required />
                            <Input name="password" label="Password" type="password" placeholder="Set student password" required />
                            <Input name="name" label="Full Name" placeholder="e.g., Rahul Sharma" required />
                            <Input name="email" label="Email" type="email" placeholder="e.g., rahul@college.edu" required />
                            <div>
                                <label className="form-label">Department</label>
                                <select name="department" className="form-input" required>
                                    <option value="">Select department</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <Input name="enrollmentYear" label="Enrollment Year" type="number" placeholder="e.g., 2023" required />
                            <Input name="phoneNumber" label="Phone Number" type="number" placeholder="e.g., 9876543210" required />
                            <div className="col-span-2">
                                <Input name="address" label="Address" placeholder="e.g., 123 Main St, City, State" required />
                            </div>
                            <div className="col-span-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                The Student ID will be used as the login ID.
                            </div>
                        </div>

                        {fetcher.data?.error && !fetcher.data?.bulkResult && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
                                <XCircle size={16} /> {fetcher.data.error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button type="submit" disabled={fetcher.state !== 'idle'}>
                                {fetcher.state !== 'idle' ? 'Adding…' : 'Add Student'}
                            </Button>
                        </div>
                    </fetcher.Form>
                )}

                {/* Bulk Upload Form */}
                {addMode === 'bulk' && (
                    <div className="space-y-4">
                        {/* CSV Format Info */}
                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                            <h4 className="text-sm font-semibold text-blue-800 mb-2">CSV Format Required</h4>
                            <p className="text-xs text-blue-600 mb-2">Your CSV file must have these exact column headers (case-insensitive):</p>
                            <code className="block text-xs bg-white px-3 py-2 rounded-lg text-blue-700 font-mono">
                                studentId,password,name,email,department,enrollmentYear,phoneNumber,address
                            </code>
                            <p className="text-xs text-blue-500 mt-2">Example: 22CSE001,secret123,Rahul Sharma,rahul@college.edu,dept_cse_id,2023,9876543210,Mumbai</p>
                            <p className="text-xs text-blue-500 mt-1">
                                <strong>department</strong> column should contain the department ID from your departments list.
                            </p>
                        </div>

                        {/* Department Reference */}
                        {departments.length > 0 && (
                            <div className="p-3 rounded-xl bg-surface-50 border border-surface-200">
                                <h4 className="text-xs font-semibold text-surface-600 mb-2">Department IDs Reference</h4>
                                <div className="flex flex-wrap gap-2">
                                    {departments.map(d => (
                                        <span key={d.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-surface-200 text-xs">
                                            <span className="font-medium text-surface-800">{d.name}</span>
                                            <span className="text-surface-400">→</span>
                                            <code className="text-primary-600">{d.id}</code>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* File Upload */}
                        <div
                            className="border-2 border-dashed border-surface-200 rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            {csvFileName ? (
                                <div className="flex flex-col items-center gap-2">
                                    <CheckCircle2 size={32} className="text-emerald-500" />
                                    <p className="font-medium text-surface-800">{csvFileName}</p>
                                    <p className="text-xs text-surface-400">
                                        {csvData.trim().split('\n').length - 1} student rows detected
                                    </p>
                                    <button
                                        className="text-xs text-primary-600 hover:underline mt-1"
                                        onClick={(e) => { e.stopPropagation(); setCsvData(''); setCsvFileName(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                    >
                                        Remove & choose another file
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Upload size={32} className="text-surface-300" />
                                    <p className="text-sm text-surface-500">Click to upload or drag & drop</p>
                                    <p className="text-xs text-surface-400">CSV files only (max 500 rows)</p>
                                </div>
                            )}
                        </div>

                        {/* Bulk Result */}
                        {fetcher.data?.bulkResult && (
                            <div className="space-y-3">
                                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CheckCircle2 size={18} className="text-emerald-600" />
                                        <span className="font-semibold text-emerald-800">Upload Complete</span>
                                    </div>
                                    <p className="text-sm text-emerald-600">
                                        {fetcher.data.bulkResult.succeeded} of {fetcher.data.bulkResult.total} students added successfully.
                                    </p>
                                </div>
                                {fetcher.data.bulkResult.failed.length > 0 && (
                                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 max-h-40 overflow-y-auto">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle size={16} className="text-amber-600" />
                                            <span className="font-semibold text-amber-800 text-sm">{fetcher.data.bulkResult.failed.length} Failed</span>
                                        </div>
                                        {fetcher.data.bulkResult.failed.map((f: any, i: number) => (
                                            <p key={i} className="text-xs text-amber-700 ml-6">• {f.email}: {f.error}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {fetcher.data?.error && !fetcher.data?.bulkResult && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
                                <XCircle size={16} /> {fetcher.data.error}
                            </div>
                        )}

                        {/* Bulk Submit */}
                        <fetcher.Form method="post">
                            <input type="hidden" name="intent" value="bulk" />
                            <input type="hidden" name="csvData" value={csvData} />
                            <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                                <Button variant="ghost" type="button" onClick={() => { setShowModal(false); setCsvData(''); setCsvFileName(''); }}>Cancel</Button>
                                <Button type="submit" disabled={!csvData || fetcher.state !== 'idle'}>
                                    {fetcher.state !== 'idle' ? 'Uploading…' : `Upload ${csvData ? csvData.trim().split('\n').length - 1 : 0} Students`}
                                </Button>
                            </div>
                        </fetcher.Form>
                    </div>
                )}
            </Modal>
        </div>
    );
}
