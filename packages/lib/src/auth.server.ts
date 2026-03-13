import { createCookieSessionStorage, redirect } from '@remix-run/node';

export interface SessionUser {
    id: string;
    role: string;
    name: string;
    email: string;
    tenantId?: string | null;
    companyId?: string | null;
}

/**
 * Factory that creates portal-specific auth helpers.
 * Each portal (admin, college, student, company) MUST call this with a unique
 * portalId so that cookies are isolated per-portal on the same domain.
 */
export function createAuthHelpers(portalId: string, options?: { maxAge?: number }) {
    const SESSION_SECRET = process.env.SESSION_SECRET || 'careernest-session-secret-change-me';

    const sessionStorage = createCookieSessionStorage({
        cookie: {
            name: `__careernest_${portalId}_session`,
            httpOnly: true,
            path: '/',
            sameSite: 'lax',
            secrets: [SESSION_SECRET],
            secure: process.env.NODE_ENV === 'production',
            ...(options?.maxAge !== undefined ? { maxAge: options.maxAge } : {}),
        },
    });

    async function getSession(request: Request) {
        return sessionStorage.getSession(request.headers.get('Cookie'));
    }

    async function commitSession(session: Awaited<ReturnType<typeof getSession>>) {
        return sessionStorage.commitSession(session);
    }

    async function destroySession(session: Awaited<ReturnType<typeof getSession>>) {
        return sessionStorage.destroySession(session);
    }

    /**
     * Create a user session cookie and redirect.
     * `token` is the Appwrite session secret used for subsequent API calls.
     */
    async function createUserSession(
        request: Request,
        token: string,
        user: SessionUser,
        redirectTo: string
    ) {
        const session = await getSession(request);
        session.set('token', token);
        session.set('user', user);
        return redirect(redirectTo, { headers: { 'Set-Cookie': await commitSession(session) } });
    }

    async function getUserSession(request: Request) {
        const session = await getSession(request);
        return {
            token: session.get('token') as string | undefined,
            user: session.get('user') as SessionUser | undefined,
        };
    }

    async function requireUserSession(request: Request) {
        const { token, user } = await getUserSession(request);
        if (!token || !user) throw redirect('/login');
        return { token, user };
    }

    async function logout(request: Request) {
        const session = await getSession(request);
        return redirect('/login', { headers: { 'Set-Cookie': await destroySession(session) } });
    }

    return { getSession, commitSession, destroySession, createUserSession, getUserSession, requireUserSession, logout };
}
