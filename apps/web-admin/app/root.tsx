import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import type { LinksFunction, MetaFunction } from '@remix-run/node';
import stylesheet from './tailwind.css?url';

export const links: LinksFunction = () => [
    { rel: 'stylesheet', href: stylesheet },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
];
export const meta: MetaFunction = () => [
    { title: 'CareerNest - Super Admin' },
    { name: 'description', content: 'Super Admin portal for CareerNest platform management' },
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
    return (
        <html lang="en" className="h-full">
            <head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><Meta /><Links /></head>
            <body className="h-full flex items-center justify-center bg-surface-50">
                <div className="text-center">
                    <h1 className="text-6xl font-bold text-primary-600 mb-4">Oops!</h1>
                    <p className="text-xl text-surface-600 mb-6">Something went wrong</p>
                    <a href="/" className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors">Go Home</a>
                </div>
                <Scripts />
            </body>
        </html>
    );
}
