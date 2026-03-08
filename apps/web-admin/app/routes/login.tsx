import { Form, useActionData, useNavigation } from '@remix-run/react';
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { getUserSession, createUserSession } from '~/auth.server';
import { Button, Input } from '@careernest/ui';
import { Mail, Lock, GraduationCap } from 'lucide-react';

export const meta: MetaFunction = () => [{ title: 'Login - Super Admin - CareerNest' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await getUserSession(request);
  if (user) return redirect('/dashboard');
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  if (!email || !password) return json({ error: 'Email and password are required' }, { status: 400 });
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) return json({ error: data?.error?.message || 'Invalid credentials' }, { status: 401 });
    // data.data = { token: sessionSecret, user: { id, name, email, role } }
    const { token, user } = data.data;
    if (!token || !user) return json({ error: 'Unexpected server response' }, { status: 500 });
    if (user.role !== 'super_admin') return json({ error: 'Access denied. Super Admin credentials required.' }, { status: 403 });
    return createUserSession(request, token, user, '/dashboard');
  } catch {
    return json({ error: 'Unable to connect to server.' }, { status: 500 });
  }
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-700/10 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 shadow-glow mb-4">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">CareerNest</h1>
          <p className="text-primary-200 mt-2">Super Admin</p>
        </div>
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold text-surface-900 mb-6">Sign in to your account</h2>
          {actionData?.error && <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{actionData.error}</div>}
          <Form method="post" className="space-y-5">
            <Input name="email" type="email" label="Email Address" placeholder="admin@careernest.com" icon={<Mail size={18} />} required />
            <Input name="password" type="password" label="Password" placeholder="••••••••" icon={<Lock size={18} />} required />
            <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign In'}</Button>
          </Form>
        </div>
      </div>
    </div>
  );
}
