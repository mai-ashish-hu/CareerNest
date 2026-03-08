import { redirect } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';

export const loader = ({ request }: LoaderFunctionArgs) => {
    return redirect('/dashboard/tenants');
};

export default function AdminTenants() {
    return null;
}
