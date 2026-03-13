import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError } from '@remix-run/react';
import type { LinksFunction, MetaFunction } from '@remix-run/node';
import stylesheet from './tailwind.css?url';

export const links: LinksFunction = () => [
    { rel: 'stylesheet', href: stylesheet },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
];
export const meta: MetaFunction = () => [
    { title: 'CareerNest - Student Portal' },
    { name: 'description', content: 'Student placement and career portal — browse drives, track applications, and build your campus profile.' },
    { name: 'theme-color', content: '#0f4c44' },
];

export default function App() {
    return (
        <html lang="en" className="h-full">
            <head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><Meta /><Links /></head>
            <body className="h-full"><Outlet /><ScrollRestoration /><Scripts /></body>
        </html>
    );
}

export function ErrorBoundary() {
    const error = useRouteError();
    const is404 = isRouteErrorResponse(error) && error.status === 404;

    return (
        <html lang="en" className="h-full">
            <head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><Meta /><Links /></head>
            <body className="h-full flex items-center justify-center bg-surface-50 p-4">
                <div className="text-center max-w-md">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-50 mb-6">
                        <span className="text-4xl">{is404 ? '🔍' : '⚠️'}</span>
                    </div>
                    <h1 className="text-5xl font-bold text-surface-900 mb-3">
                        {is404 ? '404' : 'Oops!'}
                    </h1>
                    <p className="text-lg text-surface-600 mb-2">
                        {is404 ? 'Page not found' : 'Something went wrong'}
                    </p>
                    <p className="text-sm text-surface-400 mb-8">
                        {is404
                            ? 'The page you are looking for doesn\'t exist or has been moved.'
                            : 'An unexpected error occurred. Please try again or contact support if the issue persists.'}
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <a href="/dashboard" className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors text-sm font-medium">
                            Go to Dashboard
                        </a>
                        <a href="/" className="px-5 py-2.5 border border-surface-200 text-surface-600 rounded-xl hover:bg-surface-50 transition-colors text-sm font-medium">
                            Home
                        </a>
                    </div>
                </div>
                <Scripts />
            </body>
        </html>
    );
}
