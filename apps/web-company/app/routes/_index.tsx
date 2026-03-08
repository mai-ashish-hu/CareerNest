import { redirect } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { getUserSession } from '~/auth.server';
export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await getUserSession(request);
  if (user) return redirect('/dashboard');
  return redirect('/login');
}
