import { Form, useActionData, useNavigation } from '@remix-run/react';
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { getUserSession, createUserSession, logout } from '~/auth.server';
import { Button, Input } from '@careernest/ui';
import { UserCircle, Lock, GraduationCap, ShieldCheck, Sparkles, BriefcaseBusiness } from 'lucide-react';

export const meta: MetaFunction = () => [{ title: 'Login - Student Portal - CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await getUserSession(request);
  if (user) {
    if (user.role === 'student') {
      return redirect('/dashboard');
    }
    // Invalid/stale session — destroy it
    return logout(request);
  }
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const studentId = (formData.get('studentId') as string)?.trim();
  const password = formData.get('password') as string;
  if (!studentId || !password) return json({ error: 'Student ID and password are required' }, { status: 400 });
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, password }),
    });
    const data = await response.json();
    if (!response.ok) return json({ error: data?.error?.message || 'Invalid credentials' }, { status: 401 });

    const user = data.data.user;

    // Only student role can access the Student Portal
    if (user.role !== 'student') {
      return json({ error: 'Access denied. Only student accounts can access the Student Portal.' }, { status: 403 });
    }

    return createUserSession(request, data.data.token || 'session-token', user, '/dashboard');
  } catch {
    return json({ error: 'Unable to connect to server.' }, { status: 500 });
  }
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(135deg,_#072926_0%,_#0e3752_55%,_#0f172a_100%)] p-4 sm:p-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -right-12 top-24 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="hidden text-white lg:block">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur-md">
              <GraduationCap size={16} />
              Student Placement Portal
            </div>

            <h1 className="mt-6 max-w-xl text-5xl font-bold leading-tight text-white">
              One place to prepare, apply, and grow on campus.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-white/75">
              CareerNest keeps your student profile, drive applications, announcements, and campus networking in one focused workspace.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.7rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                <ShieldCheck size={20} className="text-emerald-200" />
                <p className="mt-4 text-lg font-semibold text-white">Secure access</p>
                <p className="mt-2 text-sm leading-6 text-white/70">Use the credentials issued by your placement cell.</p>
              </div>
              <div className="rounded-[1.7rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                <Sparkles size={20} className="text-amber-200" />
                <p className="mt-4 text-lg font-semibold text-white">Stronger profile</p>
                <p className="mt-2 text-sm leading-6 text-white/70">Show projects, skills, and achievements more clearly.</p>
              </div>
              <div className="rounded-[1.7rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                <BriefcaseBusiness size={20} className="text-sky-200" />
                <p className="mt-4 text-lg font-semibold text-white">Drive-ready</p>
                <p className="mt-2 text-sm leading-6 text-white/70">Track openings and applications without friction.</p>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <div className="text-center mb-6 lg:hidden">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 shadow-lg shadow-emerald-500/25 mb-4">
                <GraduationCap size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">CareerNest</h1>
              <p className="text-white/70 mt-2 text-sm">Student Placement Portal</p>
            </div>

            <div className="student-surface-card p-6 sm:p-8">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Student login
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-surface-900">Welcome back</h2>
                <p className="mt-2 text-sm leading-6 text-surface-500">Sign in with the credentials provided by your college placement cell.</p>
              </div>

              {actionData?.error && (
                <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">!</span>
                  <span>{actionData.error}</span>
                </div>
              )}

              <Form method="post" className="space-y-4">
                <Input name="studentId" type="text" label="Student ID" placeholder="e.g., 22CSE001" icon={<UserCircle size={18} />} required autoComplete="username" />
                <Input name="password" type="password" label="Password" placeholder="••••••••" icon={<Lock size={18} />} required autoComplete="current-password" />
                <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign In'}</Button>
              </Form>

              <div className="mt-6 pt-5 border-t border-surface-100">
                <p className="text-center text-sm text-surface-500">
                  Forgot your password? Contact your TPO office.
                </p>
                <p className="text-center text-xs text-surface-400 mt-2">
                  Only student accounts can access this portal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
