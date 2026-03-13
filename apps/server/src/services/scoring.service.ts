import { EligibilityCheckResult } from '@careernest/shared';
import { VALID_STAGE_TRANSITIONS, ApplicationStage } from '@careernest/shared';
import { EligibilityError, ValidationError } from '../utils/errors';

export class ScoringService {
    /**
     * Check if a student is eligible for a drive based on eligibility rules.
     */
    checkEligibility(
        student: { CGPA: number; backlogs: number; department: string | { $id?: string; departmentName?: string } },
        driveRules: { minCGPA: number; maxBacklogs: number; departments: string[] }
    ): EligibilityCheckResult {
        const failedDetails: { rule: string; required: unknown; actual: unknown }[] = [];

        if (student.CGPA < driveRules.minCGPA) {
            failedDetails.push({
                rule: 'minCGPA',
                required: driveRules.minCGPA,
                actual: student.CGPA,
            });
        }

        if (student.backlogs > driveRules.maxBacklogs) {
            failedDetails.push({
                rule: 'maxBacklogs',
                required: driveRules.maxBacklogs,
                actual: student.backlogs,
            });
        }

        const studentDept = typeof student.department === 'object' && student.department !== null
            ? (student.department.$id || student.department.departmentName || '')
            : String(student.department || '');
        if (!driveRules.departments.includes(studentDept)) {
            failedDetails.push({
                rule: 'departments',
                required: driveRules.departments,
                actual: studentDept,
            });
        }

        if (failedDetails.length > 0) {
            return {
                eligible: false,
                reason: 'Student does not meet eligibility criteria',
                details: failedDetails,
            };
        }

        return { eligible: true };
    }

    /**
     * Validate a stage transition in the application workflow.
     */
    validateStageTransition(currentStage: ApplicationStage, newStage: ApplicationStage): void {
        const allowedNext = VALID_STAGE_TRANSITIONS[currentStage];

        if (!allowedNext || !allowedNext.includes(newStage)) {
            throw new ValidationError(
                `Invalid stage transition: '${currentStage}' → '${newStage}'`,
                [{
                    currentStage,
                    newStage,
                    allowedTransitions: allowedNext || [],
                }]
            );
        }
    }

    /**
     * Enforce eligibility - throws if not eligible.
     */
    enforceEligibility(
        student: { CGPA: number; backlogs: number; department: string },
        driveRules: { minCGPA: number; maxBacklogs: number; departments: string[] }
    ): void {
        const result = this.checkEligibility(student, driveRules);
        if (!result.eligible) {
            throw new EligibilityError(
                result.reason || 'You are not eligible for this drive',
                result.details
            );
        }
    }
}

export const scoringService = new ScoringService();
