import { Request, Response, NextFunction } from 'express';
import { driveService } from '../services/drive.service';
import { applicationService } from '../services/application.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { ForbiddenError } from '../utils/errors';
import { databases } from '../config/appwrite';
import { env } from '../config/env';
import { Query } from 'node-appwrite';

export class DriveController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = { ...req.body };

            if (req.user?.role === 'company') {
                if (!req.user.companyId) {
                    throw new ForbiddenError('Company profile not found');
                }
                payload.companies = req.user.companyId;
            }

            const drive = await driveService.create(req.tenantId!, payload);
            sendCreated(res, drive);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.role === 'company' ? req.user.companyId : undefined;
            if (req.user?.role === 'company' && !companyId) {
                throw new ForbiddenError('Company profile not found');
            }

            const drive = await driveService.getById(req.params.id, req.tenantId, companyId);
            sendSuccess(res, drive);
        } catch (error) {
            next(error);
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const filters = {
                companyId: req.user?.role === 'company'
                    ? req.user.companyId ?? undefined
                    : req.query.companyId as string | undefined,
            };

            if (req.user?.role === 'company' && !filters.companyId) {
                sendPaginated(res, [], 0, page, limit);
                return;
            }

            const result = await driveService.list(req.tenantId!, page, limit, filters);
            sendPaginated(res, result.drives, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.role === 'company' ? req.user.companyId : undefined;
            if (req.user?.role === 'company' && !companyId) {
                throw new ForbiddenError('Company profile not found');
            }

            const drive = await driveService.update(req.params.id, req.tenantId!, req.body, companyId);
            sendSuccess(res, drive);
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.role === 'company' ? req.user.companyId : undefined;
            if (req.user?.role === 'company' && !companyId) {
                throw new ForbiddenError('Company profile not found');
            }

            await driveService.delete(req.params.id, req.tenantId!, companyId);
            sendSuccess(res, { message: 'Drive deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /drives/:id/applications
     * Returns all applications for a drive, enriched with student details.
     * Accessible to TPO, TPO_ASSISTANT, and Company.
     */
    async getApplications(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.role === 'company' ? req.user.companyId : undefined;
            if (req.user?.role === 'company' && !companyId) {
                throw new ForbiddenError('Company profile not found');
            }

            // Verify access to the drive
            await driveService.getById(req.params.id, req.tenantId, companyId);

            const { page, limit } = parsePagination(req);

            const queries = [
                Query.equal('tenantId', req.tenantId!),
                Query.equal('driveId', req.params.id),
                Query.limit(limit),
                Query.offset((page - 1) * limit),
                Query.orderDesc('appliedAt'),
            ];

            if (req.query.stage) {
                queries.push(Query.equal('stage', req.query.stage as string));
            }

            const appsResult = await databases.listDocuments(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_APPLICATIONS,
                queries,
            );

            // Enrich with student details (batch fetch)
            const studentIds = [
                ...new Set(appsResult.documents.map((a: any) => a.studentId as string).filter(Boolean)),
            ];

            const studentMap = new Map<string, any>();
            if (studentIds.length > 0) {
                try {
                    const studentResults = await databases.listDocuments(
                        env.APPWRITE_DATABASE_ID,
                        env.COLLECTION_STUDENTS,
                        [Query.equal('$id', studentIds), Query.limit(500)],
                    );
                    for (const s of studentResults.documents) {
                        studentMap.set(s.$id, s);
                    }
                } catch {
                    // Silently ignore — student lookup is best-effort
                }

                // Fetch student profiles for headshots/headlines
                try {
                    const profileResults = await databases.listDocuments(
                        env.APPWRITE_DATABASE_ID,
                        env.COLLECTION_STUDENT_PROFILES,
                        [Query.equal('studentId', studentIds), Query.limit(500)],
                    );
                    for (const p of profileResults.documents) {
                        const existing = studentMap.get(p.studentId as string) || {};
                        studentMap.set(p.studentId as string, {
                            ...existing,
                            _profile: p,
                        });
                    }
                } catch {
                    // Student profiles are optional
                }
            }

            const enrichedApplications = appsResult.documents.map((app: any) => {
                const student = studentMap.get(app.studentId) || {};
                const profile = student._profile || {};
                return {
                    ...app,
                    student: {
                        $id: app.studentId,
                        name: student.name || '',
                        email: student.email || '',
                        phoneNumber: student.phoneNumber || '',
                        enrollmentYear: student.enrollmentYear || null,
                        departmentName: student.departmentName || '',
                        cgpa: profile.cgpa || student.cgpa || null,
                        currentYear: profile.currentYear || student.currentYear || null,
                        profilePicture: profile.profilePicture || '',
                        headline: profile.headline || '',
                        isPlaced: student.isPlaced || false,
                    },
                };
            });

            sendPaginated(res, enrichedApplications, appsResult.total, page, limit);
        } catch (error) {
            next(error);
        }
    }
}

export const driveController = new DriveController();
