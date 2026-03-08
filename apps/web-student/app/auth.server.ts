import { createAuthHelpers } from '@careernest/lib/auth.server';

// 30-day persistent session so returning students are auto-redirected to dashboard
export const { getSession, commitSession, destroySession, createUserSession, getUserSession, requireUserSession, logout } = createAuthHelpers('student', { maxAge: 60 * 60 * 24 * 30 });
