// ─── Status Constants ───

export const TENANT_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
} as const;

export type TenantStatus = (typeof TENANT_STATUS)[keyof typeof TENANT_STATUS];

export const USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    BLOCKED: 'blocked',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const COMPANY_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export type CompanyStatus = (typeof COMPANY_STATUS)[keyof typeof COMPANY_STATUS];

export const DRIVE_STATUS = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    CLOSED: 'closed',
} as const;

export type DriveStatus = (typeof DRIVE_STATUS)[keyof typeof DRIVE_STATUS];

export const SUBSCRIPTION_PLAN = {
    FREE: 'free',
    BASIC: 'basic',
    PRO: 'pro',
} as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN)[keyof typeof SUBSCRIPTION_PLAN];
