// ─── Common/Shared Types ───

export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: ApiError;
}

export interface ApiError {
    code: string;
    message: string;
    details?: unknown[];
}

export interface EligibilityCheckResult {
    eligible: boolean;
    reason?: string;
    details?: { rule: string; required: unknown; actual: unknown }[];
}

// Analytics types
export interface DepartmentStat {
    department: string;
    total: number;
    placed: number;
    percentage: number;
}

export interface DriveConversion {
    driveId: string;
    company: string;
    applied: number;
    selected: number;
    rate: number;
}

export interface PlacementAnalytics {
    placementPercentage: number;
    totalStudents: number;
    placedStudents: number;
    departmentStats: DepartmentStat[];
    driveConversion: DriveConversion[];
}
