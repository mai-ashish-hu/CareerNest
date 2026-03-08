import { createAuthHelpers } from '@careernest/lib/auth.server';

export const { getSession, commitSession, destroySession, createUserSession, getUserSession, requireUserSession, logout } = createAuthHelpers('admin');
