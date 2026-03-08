// ─── Role Constants ───
export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    TPO: 'tpo',
    TPO_ASSISTANT: 'tpo_assistant',
    STUDENT: 'student',
    COMPANY: 'company',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
    [ROLES.SUPER_ADMIN]: 'Super Admin',
    [ROLES.TPO]: 'TPO',
    [ROLES.TPO_ASSISTANT]: 'TPO Assistant',
    [ROLES.STUDENT]: 'Student',
    [ROLES.COMPANY]: 'Company',
};

// Role hierarchy for permission checks (higher index = more permission)
export const ROLE_HIERARCHY: Role[] = [
    ROLES.STUDENT,
    ROLES.COMPANY,
    ROLES.TPO_ASSISTANT,
    ROLES.TPO,
    ROLES.SUPER_ADMIN,
];
