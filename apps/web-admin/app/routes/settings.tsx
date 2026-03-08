import { redirect } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';

export const loader = ({ request }: LoaderFunctionArgs) => {
    return redirect('/dashboard/settings');
};

export default function AdminSettings() {
    return null;
}
