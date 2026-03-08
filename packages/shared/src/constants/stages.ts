// ─── Application Stage Constants ───
export const APPLICATION_STAGES = {
    APPLIED: 'applied',
    UNDER_REVIEW: 'under_review',
    SHORTLISTED: 'shortlisted',
    INTERVIEW_SCHEDULED: 'interview_scheduled',
    SELECTED: 'selected',
    REJECTED: 'rejected',
} as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[keyof typeof APPLICATION_STAGES];

export const STAGE_LABELS: Record<ApplicationStage, string> = {
    [APPLICATION_STAGES.APPLIED]: 'Applied',
    [APPLICATION_STAGES.UNDER_REVIEW]: 'Under Review',
    [APPLICATION_STAGES.SHORTLISTED]: 'Shortlisted',
    [APPLICATION_STAGES.INTERVIEW_SCHEDULED]: 'Interview Scheduled',
    [APPLICATION_STAGES.SELECTED]: 'Selected',
    [APPLICATION_STAGES.REJECTED]: 'Rejected',
};

// Valid stage transitions: key = current stage, value = allowed next stages
export const VALID_STAGE_TRANSITIONS: Record<ApplicationStage, ApplicationStage[]> = {
    [APPLICATION_STAGES.APPLIED]: [APPLICATION_STAGES.UNDER_REVIEW, APPLICATION_STAGES.REJECTED],
    [APPLICATION_STAGES.UNDER_REVIEW]: [APPLICATION_STAGES.SHORTLISTED, APPLICATION_STAGES.REJECTED],
    [APPLICATION_STAGES.SHORTLISTED]: [APPLICATION_STAGES.INTERVIEW_SCHEDULED, APPLICATION_STAGES.REJECTED],
    [APPLICATION_STAGES.INTERVIEW_SCHEDULED]: [APPLICATION_STAGES.SELECTED, APPLICATION_STAGES.REJECTED],
    [APPLICATION_STAGES.SELECTED]: [],   // Final state
    [APPLICATION_STAGES.REJECTED]: [],   // Final state
};
