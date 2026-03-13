import type { StudentProfileResponse } from '@careernest/shared';
import { Badge, Button, Card } from '@careernest/ui';
import { ArrowLeft, MessagesSquare } from 'lucide-react';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { api } from '@careernest/lib';
import { StudentProfileView } from '~/components/StudentProfileView';
import { requireUserSession } from '~/auth.server';

export const meta: MetaFunction = () => [{ title: 'Campus Profile – Student – CareerNest' }];

export async function loader({ request, params }: LoaderFunctionArgs) {
    const { token } = await requireUserSession(request);
    const studentId = params.studentId;

    if (!studentId) {
        throw new Response('Student not found', { status: 404 });
    }

    try {
        const response = await api.students.getDirectoryProfile(token, studentId) as {
            data: StudentProfileResponse;
        };
        return json({ profile: response.data });
    } catch {
        throw new Response('Student profile not found', { status: 404 });
    }
}

export default function CampusStudentProfile() {
    const { profile } = useLoaderData<typeof loader>() as { profile: StudentProfileResponse };

    return (
        <div className="space-y-6 animate-fade-in">
            <Card className="student-surface-card !p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <Link to="/network" className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700">
                            <ArrowLeft size={16} />
                            Back to network
                        </Link>
                        <h1 className="mt-3 text-2xl font-bold text-surface-900">Campus profile</h1>
                        <p className="mt-1 text-surface-500">
                            You are viewing the public campus version of this student profile. Contact details remain hidden.
                        </p>
                    </div>
                    <Badge variant="bg-primary-50 text-primary-700">Same college only</Badge>
                </div>
            </Card>

            <StudentProfileView
                profile={profile}
                action={
                    <Link to="/chat">
                        <Button variant="secondary">
                            <MessagesSquare size={16} />
                            Open campus chat
                        </Button>
                    </Link>
                }
                sidebar={
                    <Card className="student-surface-card !p-5">
                        <h2 className="text-lg font-semibold text-surface-900">Privacy</h2>
                        <p className="mt-3 text-sm leading-6 text-surface-500">
                            This page intentionally excludes private contact details. Students in other colleges cannot open this profile.
                        </p>
                        <div className="mt-5 rounded-2xl bg-surface-50 p-4 text-sm text-surface-600">
                            Use campus chat for internal networking, collaboration, and placement discussion.
                        </div>
                    </Card>
                }
            />
        </div>
    );
}
