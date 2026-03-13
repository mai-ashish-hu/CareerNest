import { ArrowLeft, Mail, Phone, MapPin, Calendar, BookOpen, Award, Briefcase, GraduationCap, User, Hash } from 'lucide-react';
import { Button, Card, Badge, Avatar } from '@careernest/ui';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, Link as RemixLink } from '@remix-run/react';
import { requireUserSession } from '~/auth.server';
import { api } from '@careernest/lib';

export const meta: MetaFunction = () => [{ title: 'Student Profile – College – CareerNest' }];

export async function loader({ request, params }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    if ((user.role !== 'tpo' && user.role !== 'tpo_assistant') || !user.tenantId) throw redirect('/login');

    const studentId = params.id!;
    let student: any = null;
    let profile: any = null;
    let applications: any[] = [];

    try {
        const res = await api.students.getById(token, studentId) as any;
        student = res.data || res;
    } catch {
        throw new Response('Student not found', { status: 404 });
    }

    // Attempt to get profile (optional)
    try {
        const profileRes = await api.students.getDirectoryProfile(token, studentId) as any;
        profile = profileRes.data || profileRes;
    } catch { /* profile is optional */ }

    // Attempt to get applications
    try {
        const appsRes = await api.applications.list(token, `studentId=${studentId}&limit=50`) as any;
        applications = appsRes.data || [];
    } catch { /* applications are optional */ }

    return json({ student, profile, applications });
}

function formatDate(d: string | null | undefined) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function stageBadge(stage: string) {
    const map: Record<string, string> = {
        applied: 'bg-blue-50 text-blue-700',
        under_review: 'bg-yellow-50 text-yellow-700',
        shortlisted: 'bg-purple-50 text-purple-700',
        interview_scheduled: 'bg-indigo-50 text-indigo-700',
        selected: 'bg-emerald-50 text-emerald-700',
        rejected: 'bg-rose-50 text-rose-700',
    };
    return map[stage] || 'bg-surface-50 text-surface-600';
}

function stageLabel(stage: string) {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function StudentProfile() {
    const { student, profile, applications } = useLoaderData<typeof loader>() as {
        student: any; profile: any; applications: any[];
    };

    const name = student?.name || '—';
    const email = student?.email || '—';
    const phone = student?.phoneNumber || student?.phone || '—';
    const address = student?.address || '—';
    const studentId = student?.studentId || '—';
    const enrollmentYear = student?.enrollmentYear || student?.enrollmentyear || '—';
    const deptName = student?.departmentName || (Array.isArray(student?.department)
        ? (student.department[0]?.name || student.department[0] || '—')
        : (student?.department?.name || student?.department || '—'));

    // Profile fields
    const headline = profile?.headline || '';
    const summary = profile?.summary || profile?.bio || '';
    const cgpa = profile?.cgpa ?? student?.cgpa ?? null;
    const currentYear = profile?.currentYear ?? null;
    const skills: string[] = profile?.skills || [];
    const achievements: any[] = profile?.achievements || [];
    const education: any[] = profile?.education || [];
    const experience: any[] = profile?.experience || [];
    const projects: any[] = profile?.projects || [];
    const profilePic = profile?.profilePicture || '';

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            {/* Back button */}
            <RemixLink to="/students" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 transition-colors">
                <ArrowLeft size={16} /> Back to Students
            </RemixLink>

            {/* Profile Header */}
            <Card className="!p-6">
                <div className="flex flex-col sm:flex-row items-start gap-5">
                    <div className="flex-shrink-0">
                        {profilePic ? (
                            <img src={profilePic} alt={name} className="w-20 h-20 rounded-2xl object-cover shadow" />
                        ) : (
                            <Avatar name={name} size="lg" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold text-surface-900">{name}</h1>
                            {student?.isPlaced && (
                                <Badge variant="bg-emerald-50 text-emerald-700">Placed ✓</Badge>
                            )}
                        </div>
                        {headline && <p className="text-surface-500 mb-3">{headline}</p>}
                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-surface-600">
                            <span className="flex items-center gap-1.5"><Hash size={14} className="text-surface-400" /> {studentId}</span>
                            <span className="flex items-center gap-1.5"><Mail size={14} className="text-surface-400" /> {email}</span>
                            {phone !== '—' && <span className="flex items-center gap-1.5"><Phone size={14} className="text-surface-400" /> {phone}</span>}
                            {address !== '—' && <span className="flex items-center gap-1.5"><MapPin size={14} className="text-surface-400" /> {address}</span>}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-3">
                            <Badge variant="bg-primary-50 text-primary-700">{deptName}</Badge>
                            <Badge variant="bg-surface-100 text-surface-600"><Calendar size={12} className="inline mr-1" />Enrolled {enrollmentYear}</Badge>
                            {currentYear && <Badge variant="bg-indigo-50 text-indigo-700"><GraduationCap size={12} className="inline mr-1" />{currentYear} Year</Badge>}
                            {cgpa != null && <Badge variant="bg-amber-50 text-amber-700">CGPA {cgpa}</Badge>}
                        </div>
                    </div>
                </div>
                {summary && (
                    <div className="mt-5 pt-5 border-t border-surface-100">
                        <p className="text-sm text-surface-600 leading-relaxed">{summary}</p>
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column */}
                <div className="space-y-5">
                    {/* Skills */}
                    {skills.length > 0 && (
                        <Card className="!p-5">
                            <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2"><BookOpen size={16} /> Skills</h3>
                            <div className="flex flex-wrap gap-2">
                                {skills.map((s, i) => (
                                    <span key={i} className="px-2.5 py-1 text-xs bg-primary-50 text-primary-700 rounded-full font-medium">{s}</span>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Applications */}
                    {applications.length > 0 && (
                        <Card className="!p-5">
                            <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2"><Briefcase size={16} /> Applications ({applications.length})</h3>
                            <div className="space-y-2">
                                {applications.slice(0, 6).map((app: any) => (
                                    <div key={app.$id || app.id} className="flex items-center justify-between py-1.5">
                                        <span className="text-sm text-surface-700 truncate">{app.driveTitle || app.driveId || '—'}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageBadge(app.stage)}`}>{stageLabel(app.stage)}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Right column */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Education */}
                    {education.length > 0 && (
                        <Card className="!p-5">
                            <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2"><GraduationCap size={16} /> Education</h3>
                            <div className="space-y-4">
                                {education.map((edu: any, i: number) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="p-2 rounded-lg bg-surface-50 flex-shrink-0 h-fit"><GraduationCap size={16} className="text-surface-400" /></div>
                                        <div>
                                            <p className="font-medium text-surface-900">{edu.institution || edu.school || '—'}</p>
                                            <p className="text-sm text-surface-600">{edu.degree || ''}{edu.field ? ` – ${edu.field}` : ''}</p>
                                            <p className="text-xs text-surface-400">{formatDate(edu.startDate)} – {edu.endDate ? formatDate(edu.endDate) : 'Present'}{edu.grade ? ` · CGPA ${edu.grade}` : ''}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Experience */}
                    {experience.length > 0 && (
                        <Card className="!p-5">
                            <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2"><Briefcase size={16} /> Experience</h3>
                            <div className="space-y-4">
                                {experience.map((exp: any, i: number) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="p-2 rounded-lg bg-surface-50 flex-shrink-0 h-fit"><Briefcase size={16} className="text-surface-400" /></div>
                                        <div>
                                            <p className="font-medium text-surface-900">{exp.role || exp.title || '—'}</p>
                                            <p className="text-sm text-surface-600">{exp.company || ''}</p>
                                            <p className="text-xs text-surface-400">{formatDate(exp.startDate)} – {exp.endDate ? formatDate(exp.endDate) : 'Present'}</p>
                                            {exp.description && <p className="text-sm text-surface-500 mt-1">{exp.description}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Projects */}
                    {projects.length > 0 && (
                        <Card className="!p-5">
                            <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2"><User size={16} /> Projects</h3>
                            <div className="space-y-4">
                                {projects.map((proj: any, i: number) => (
                                    <div key={i}>
                                        <div className="flex items-start justify-between">
                                            <p className="font-medium text-surface-900">{proj.title || '—'}</p>
                                            {proj.link && (
                                                <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline">View →</a>
                                            )}
                                        </div>
                                        {proj.description && <p className="text-sm text-surface-600 mt-1">{proj.description}</p>}
                                        {proj.techStack && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {(Array.isArray(proj.techStack) ? proj.techStack : proj.techStack.split(',')).map((t: string, j: number) => (
                                                    <span key={j} className="px-2 py-0.5 text-xs bg-surface-100 text-surface-600 rounded">{t.trim()}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Achievements */}
                    {achievements.length > 0 && (
                        <Card className="!p-5">
                            <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2"><Award size={16} /> Achievements</h3>
                            <div className="space-y-3">
                                {achievements.map((ach: any, i: number) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="p-2 rounded-lg bg-amber-50 flex-shrink-0 h-fit"><Award size={16} className="text-amber-500" /></div>
                                        <div>
                                            <p className="font-medium text-surface-900">{ach.title || '—'}</p>
                                            {ach.description && <p className="text-sm text-surface-500">{ach.description}</p>}
                                            {ach.date && <p className="text-xs text-surface-400 mt-0.5">{formatDate(ach.date)}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Empty state when no profile data */}
                    {!headline && !summary && skills.length === 0 && education.length === 0 && experience.length === 0 && projects.length === 0 && (
                        <Card className="!p-8 text-center">
                            <User size={32} className="mx-auto text-surface-300 mb-3" />
                            <p className="text-surface-500 text-sm">This student hasn't completed their profile yet.</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
