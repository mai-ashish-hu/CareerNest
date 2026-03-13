import { Request, Response, NextFunction } from 'express';
import { databases, storage } from '../config/appwrite';
import { env } from '../config/env';
import { ID, Query } from 'node-appwrite';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { NotFoundError, AppError } from '../utils/errors';

export class CourseController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                name,
                department,
                courseType = 'link',
                contentLink,
                videoFileId: existingVideoFileId,
                videoFileName,
                videoFileType,
                videoBase64,
                streamUrl,
                streamStartTime,
                thumbnailUrl,
                instructor,
                isPublished = true,
            } = req.body;

            let videoFileId = existingVideoFileId || '';

            // If a video was uploaded as base64, store it in Appwrite storage
            if (courseType === 'video' && videoBase64 && videoFileName && videoFileType) {
                try {
                    // Decode base64 to binary
                    const buffer = Buffer.from(videoBase64, 'base64');
                    const uint8Array = new Uint8Array(buffer);

                    const uploadedFile = await storage.createFile(
                        env.APPWRITE_BUCKET_COURSE_VIDEOS,
                        ID.unique(),
                        new File([uint8Array], videoFileName, { type: videoFileType }),
                    );
                    videoFileId = uploadedFile.$id;
                } catch (uploadErr: any) {
                    throw new AppError(
                        400,
                        'VIDEO_UPLOAD_FAILED',
                        `Video upload failed: ${uploadErr?.message || 'unknown error'}`,
                    );
                }
            }

            const courseData: Record<string, unknown> = {
                tenantId: req.tenantId,
                name,
                department: department || '',
                courseType,
                instructor: instructor || '',
                isPublished: isPublished ?? true,
            };

            if (courseType === 'link') {
                courseData.contentLink = contentLink || '';
            } else if (courseType === 'video') {
                courseData.videoFileId = videoFileId;
            } else if (courseType === 'livestream') {
                courseData.streamUrl = streamUrl || '';
                if (streamStartTime && streamStartTime !== '') {
                    courseData.streamStartTime = streamStartTime;
                }
            }

            if (thumbnailUrl && thumbnailUrl !== '') {
                courseData.thumbnailUrl = thumbnailUrl;
            }

            const course = await databases.createDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_COURSES,
                ID.unique(),
                courseData,
            );
            sendCreated(res, course);
        } catch (error) {
            next(error);
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = parsePagination(req);
            const queries = [
                Query.equal('tenantId', req.tenantId!),
                Query.limit(limit),
                Query.offset((page - 1) * limit),
                Query.orderDesc('$createdAt'),
            ];

            if (req.query.courseType) {
                queries.push(Query.equal('courseType', req.query.courseType as string));
            }

            // Students only see published courses
            if (req.user?.role === 'student') {
                queries.push(Query.equal('isPublished', true));
            }

            const result = await databases.listDocuments(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_COURSES,
                queries,
            );
            sendPaginated(res, result.documents, result.total, page, limit);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const course = await databases.getDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_COURSES,
                req.params.id,
            );

            if (course.tenantId !== req.tenantId) {
                throw new NotFoundError('Course');
            }

            // For video courses, generate a view URL from Appwrite storage
            if (course.courseType === 'video' && course.videoFileId) {
                const previewUrl = `${env.APPWRITE_PUBLIC_ENDPOINT}/storage/buckets/${env.APPWRITE_BUCKET_COURSE_VIDEOS}/files/${course.videoFileId}/view?project=${env.APPWRITE_PROJECT_ID}`;
                sendSuccess(res, { ...course, videoUrl: previewUrl });
                return;
            }

            sendSuccess(res, course);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const course = await databases.getDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_COURSES,
                req.params.id,
            );

            if (course.tenantId !== req.tenantId) {
                throw new NotFoundError('Course');
            }

            const {
                name,
                department,
                instructor,
                isPublished,
                contentLink,
                streamUrl,
                streamStartTime,
                thumbnailUrl,
            } = req.body;

            const updateData: Record<string, unknown> = {};
            if (name !== undefined) updateData.name = name;
            if (department !== undefined) updateData.department = department;
            if (instructor !== undefined) updateData.instructor = instructor;
            if (isPublished !== undefined) updateData.isPublished = isPublished;
            if (contentLink !== undefined) updateData.contentLink = contentLink;
            if (streamUrl !== undefined) updateData.streamUrl = streamUrl;
            if (streamStartTime !== undefined) updateData.streamStartTime = streamStartTime || null;
            if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;

            const updated = await databases.updateDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_COURSES,
                req.params.id,
                updateData,
            );
            sendSuccess(res, updated);
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const course = await databases.getDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_COURSES,
                req.params.id,
            );

            if (course.tenantId !== req.tenantId) {
                throw new NotFoundError('Course');
            }

            // Also delete the video file from storage if it exists
            if (course.courseType === 'video' && course.videoFileId) {
                try {
                    await storage.deleteFile(env.APPWRITE_BUCKET_COURSE_VIDEOS, course.videoFileId as string);
                } catch {
                    // Silently ignore if file deletion fails
                }
            }

            await databases.deleteDocument(
                env.APPWRITE_DATABASE_ID,
                env.COLLECTION_COURSES,
                req.params.id,
            );
            sendSuccess(res, { message: 'Course deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

export const courseController = new CourseController();
