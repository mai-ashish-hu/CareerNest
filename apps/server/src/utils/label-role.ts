import { Role } from '@careernest/shared';

/**
 * Maps Appwrite Auth Labels to CareerNest roles.
 * Labels are assigned to users inside the Appwrite Auth dashboard.
 *
 * The first matching label (by priority) wins:
 *   "SuperAdmin"   → super_admin
 *   "TPO"          → tpo
 *   "TPOAssistant" → tpo_assistant
 *   "Student"      → student
 *   "Company"      → company
 */
const LABEL_TO_ROLE: Record<string, Role> = {
    SuperAdmin: 'super_admin',
    TPO: 'tpo',
    TPOAssistant: 'tpo_assistant',
    Student: 'student',
    Company: 'company',
};

/** Priority order — higher-privilege roles checked first */
const LABEL_PRIORITY: string[] = [
    'SuperAdmin',
    'TPO',
    'TPOAssistant',
    'Student',
    'Company',
];

/**
 * Derive the CareerNest role from an array of Appwrite Auth labels.
 * Case-insensitive matching — "student", "Student", "STUDENT" all work.
 * Returns `undefined` if no recognised label is found.
 */
export function mapLabelsToRole(labels: string[]): Role | undefined {
    const lowerLabels = labels.map(l => l.toLowerCase());
    for (const label of LABEL_PRIORITY) {
        if (lowerLabels.includes(label.toLowerCase())) {
            return LABEL_TO_ROLE[label];
        }
    }
    return undefined;
}
