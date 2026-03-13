import { ID, Permission, Query, Role } from 'node-appwrite';
import sharp from 'sharp';
import {
    StudentDirectoryItem,
    StudentProfileResponse,
    UpdateStudentProfileInput,
} from '@careernest/shared';
import { databases, storage } from '../config/appwrite';
import { env } from '../config/env';
import { NotFoundError, ValidationError } from '../utils/errors';
import { studentService } from './student.service';

type StudentDoc = Record<string, any>;

type ProfileSectionCollections = {
    achievements: string;
    education: string;
    experience: string;
    projects: string;
    skills: string;
};

const PROFILE_SECTION_COLLECTIONS: ProfileSectionCollections = {
    achievements: env.COLLECTION_STUDENT_ACHIEVEMENTS,
    education: env.COLLECTION_STUDENT_EDUCATION,
    experience: env.COLLECTION_STUDENT_EXPERIENCE,
    projects: env.COLLECTION_STUDENT_PROJECTS,
    skills: env.COLLECTION_STUDENT_SKILLS,
};

function normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeSearchText(value: unknown): string {
    const normalized = normalizeText(value);
    if (!normalized) return '';

    return normalized
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function nullableText(value: unknown): string | null {
    const normalized = normalizeText(value);
    return normalized || null;
}

function normalizeArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? value as T[] : [];
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeFloat(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function safeInt(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = parseInt(String(value), 10);
    return Number.isFinite(num) ? num : null;
}

function safeStringArray(value: unknown): string[] {
    return normalizeArray<unknown>(value)
        .map((item) => normalizeText(item))
        .filter(Boolean);
}

function decodeBase64Payload(value: string): Buffer {
    const payload = value.includes(',') ? value.split(',').pop() || '' : value;
    return Buffer.from(payload, 'base64');
}

const PROFILE_PHOTO_SIZE = 320;

async function normalizeProfilePhoto(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
        .rotate()
        .resize(PROFILE_PHOTO_SIZE, PROFILE_PHOTO_SIZE, {
            fit: 'cover',
            position: 'centre',
        })
        .png({ compressionLevel: 9 })
        .toBuffer();
}

function trimTrailingSlash(value: string): string {
    return value.replace(/\/+$/, '');
}

function safeDecodeUriComponent(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export class StudentProfileService {
    private readonly databaseId = env.APPWRITE_DATABASE_ID;
    private readonly studentCollectionId = env.COLLECTION_STUDENTS;
    private readonly tenantCollectionId = env.COLLECTION_TENANTS;
    private readonly departmentCollectionId = env.COLLECTION_DEPARTMENTS;
    private readonly profileCollectionId = env.COLLECTION_STUDENT_PROFILES;
    private readonly profilePhotoBucketId = env.APPWRITE_BUCKET_PROFILE_PHOTOS;
    private readonly certificateBucketId = env.APPWRITE_BUCKET_CERTIFICATES;
    private readonly appwriteAssetEndpoint = trimTrailingSlash(env.APPWRITE_PUBLIC_ENDPOINT);
    private readonly referenceLabelCache = new Map<string, { id?: string; label: string }>();

    // Appwrite "view" endpoint returns the original file and does not
    // require additional query parameters (width/height) that preview needs.
    // Using view avoids broken images when preview is requested without size
    // and keeps things simple for profile pictures.
    private buildProfilePhotoUrl(bucketId: string, fileId: string): string {
        const baseUrl = `${this.appwriteAssetEndpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}/view`;
        return `${baseUrl}?project=${encodeURIComponent(env.APPWRITE_PROJECT_ID)}`;
    }

    private normalizeProfilePictureUrl(value: unknown): string {
        const normalized = normalizeText(value);
        if (!normalized) return '';

        // if it's a valid URL from Appwrite, we simply ensure it uses the
        // "view" endpoint and includes the project query param.  Anything else
        // (external URL, already correct string) is returned unchanged.
        try {
            const parsed = new URL(normalized);
            const match = parsed.pathname.match(/\/storage\/buckets\/([^/]+)\/files\/([^/]+)\/(view|preview)\/?$/);
            if (!match) return normalized;

            const bucketId = safeDecodeUriComponent(match[1]);
            const fileId = safeDecodeUriComponent(match[2]);
            const query = new URLSearchParams(parsed.search);
            const projectId = query.get('project') || env.APPWRITE_PROJECT_ID;
            // always use view endpoint so the browser gets the actual image
            const baseUrl = `${this.appwriteAssetEndpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}/view`;
            return `${baseUrl}?project=${encodeURIComponent(projectId)}`;
        } catch {
            return normalized;
        }
    }

    private getErrorMessage(error: unknown): string {
        const maybeError = error as { response?: { message?: string }; message?: string };
        return maybeError?.response?.message || maybeError?.message || '';
    }

    private isDocumentNotFoundError(error: unknown): boolean {
        const maybeError = error as { response?: { type?: string; code?: number }; code?: number };
        const message = this.getErrorMessage(error);
        return maybeError?.response?.type === 'document_not_found'
            || maybeError?.response?.code === 404
            || maybeError?.code === 404
            || (message.includes('Document with the requested ID') && message.includes('could not be found'));
    }

    private isMissingSchemaError(error: unknown): boolean {
        const message = this.getErrorMessage(error);
        return [
            'Collection with the requested ID could not be found',
            'Unknown attribute',
            'Attribute not found',
            'Index not found',
        ].some((fragment) => message.includes(fragment));
    }

    private createMissingSchemaError(collectionId: string): ValidationError {
        return new ValidationError(
            `Appwrite collection "${collectionId}" is not ready. Complete the student profile schema setup before editing this feature.`
        );
    }

    private getReferenceCacheKey(collectionId: string, refId: string): string {
        return `${collectionId}:${refId}`;
    }

    private async safeList(
        collectionId: string,
        queries: string[]
    ): Promise<Array<Record<string, any>>> {
        try {
            const result = await databases.listDocuments(this.databaseId, collectionId, queries);
            return result.documents as Array<Record<string, any>>;
        } catch (error) {
            if (this.isMissingSchemaError(error)) {
                return [];
            }
            throw error;
        }
    }

    private async safeGetProfileDoc(studentId: string): Promise<Record<string, any> | null> {
        try {
            return await databases.getDocument(this.databaseId, this.profileCollectionId, studentId) as Record<
                string,
                any
            >;
        } catch (error) {
            if (this.isDocumentNotFoundError(error)) {
                return null;
            }
            if (this.isMissingSchemaError(error)) {
                return null;
            }
            throw error;
        }
    }

    private async resolveReferenceLabel(
        collectionId: string,
        ref: unknown,
        labelKeys: string[]
    ): Promise<{ id?: string; label: string }> {
        if (!ref) return { label: '' };

        if (Array.isArray(ref) && ref.length > 0) {
            return this.resolveReferenceLabel(collectionId, ref[0], labelKeys);
        }

        if (isObject(ref)) {
            const doc = ref as Record<string, unknown>;
            const label = labelKeys
                .map((key) => doc[key])
                .find((value) => typeof value === 'string' && value.trim().length > 0);
            const resolved = {
                id: typeof doc.$id === 'string' ? doc.$id : undefined,
                label: typeof label === 'string' ? label : '',
            };
            if (resolved.id && resolved.label) {
                this.referenceLabelCache.set(this.getReferenceCacheKey(collectionId, resolved.id), resolved);
            }
            return resolved;
        }

        if (typeof ref === 'string') {
            const cacheKey = this.getReferenceCacheKey(collectionId, ref);
            const cached = this.referenceLabelCache.get(cacheKey);
            if (cached) {
                return cached;
            }

            try {
                const doc = await databases.getDocument(this.databaseId, collectionId, ref);
                const label = labelKeys
                    .map((key) => (doc as Record<string, unknown>)[key])
                    .find((value) => typeof value === 'string' && value.trim().length > 0);
                const resolved = { id: ref, label: typeof label === 'string' ? label : ref };
                this.referenceLabelCache.set(cacheKey, resolved);
                return resolved;
            } catch {
                return { id: ref, label: ref };
            }
        }

        return { label: '' };
    }

    private async buildIdentity(student: StudentDoc) {
        const departmentField = student.departements ?? student.departments ?? student.department;
        const collegeField = student.colleges ?? student.college ?? student.tenantId;

        const [department, college] = await Promise.all([
            this.resolveReferenceLabel(this.departmentCollectionId, departmentField, ['departmentName', 'name']),
            this.resolveReferenceLabel(this.tenantCollectionId, collegeField, ['name']),
        ]);

        return {
            studentId: String(student.$id || ''),
            name: normalizeText(student.name),
            email: normalizeText(student.email),
            phoneNumber: student.phoneNumber != null ? String(student.phoneNumber) : '',
            departmentId: department.id,
            departmentName: department.label,
            collegeId: college.id,
            collegeName: college.label,
            createdAt: normalizeText(student.$createdAt),
        };
    }

    private buildLegacySummary(student: StudentDoc) {
        const academicInfo = isObject(student.academicInfo) ? student.academicInfo : {};
        return {
            headline: normalizeText(student.headline),
            about: normalizeText(student.about),
            city: normalizeText(student.city),
            currentYear: normalizeText(academicInfo.currentYear ?? student.currentYear),
            cgpa: (() => { const v = academicInfo.cgpa ?? student.cgpa ?? student.CGPA; return v != null ? String(v) : ''; })(),
            profilePicture: this.normalizeProfilePictureUrl(student.profilePicture),
            skills: safeStringArray(student.skills),
            achievements: normalizeArray<Record<string, unknown>>(student.achievements),
            education: normalizeArray<Record<string, unknown>>(student.education),
            experience: normalizeArray<Record<string, unknown>>(student.experience),
            projects: normalizeArray<Record<string, unknown>>(student.projects),
        };
    }

    private buildCompletionScore(args: {
        about: string;
        city: string;
        currentYear: string;
        cgpa: string;
        profilePicture: string;
        skills: string[];
        achievements: Array<unknown>;
        education: Array<unknown>;
        experience: Array<unknown>;
        projects: Array<unknown>;
    }): number {
        const completed = [
            args.about,
            args.city,
            args.currentYear,
            args.cgpa,
            args.profilePicture,
            args.skills.length > 0 ? 'yes' : '',
            args.achievements.length > 0 ? 'yes' : '',
            args.education.length > 0 ? 'yes' : '',
            args.experience.length > 0 ? 'yes' : '',
            args.projects.length > 0 ? 'yes' : '',
        ].filter(Boolean).length;

        return Math.round((completed / 10) * 100);
    }

    private buildHeadline(
        savedHeadline: string,
        departmentName: string,
        currentYear: string,
        skills: string[]
    ): string {
        if (savedHeadline) return savedHeadline;
        if (skills.length > 0 && departmentName) {
            return `${skills[0]} focused ${departmentName} student`;
        }
        if (currentYear && departmentName) {
            return `${currentYear} ${departmentName} student`;
        }
        if (departmentName) {
            return `${departmentName} student`;
        }
        return 'Student at CareerNest';
    }

    private mapAchievement(doc: Record<string, any>, fallbackId: string) {
        return {
            id: String(doc.$id || fallbackId),
            title: normalizeText(doc.title),
            description: normalizeText(doc.description),
            certificateUrl: normalizeText(doc.certificateUrl),
        };
    }

    private mapEducation(doc: Record<string, any>, fallbackId: string) {
        return {
            id: String(doc.$id || fallbackId),
            level: normalizeText(doc.level),
            institution: normalizeText(doc.institution),
            board: normalizeText(doc.board),
            department: normalizeText(doc.department),
            marks: doc.marks != null ? String(doc.marks) : '',
            year: doc.year != null ? String(doc.year) : '',
        };
    }

    private mapExperience(doc: Record<string, any>, fallbackId: string) {
        return {
            id: String(doc.$id || fallbackId),
            title: normalizeText(doc.title),
            company: normalizeText(doc.company),
            description: normalizeText(doc.description),
            start: normalizeText(doc.start),
            end: normalizeText(doc.end),
            certificateUrl: normalizeText(doc.certificateUrl),
        };
    }

    private mapProject(doc: Record<string, any>, fallbackId: string) {
        return {
            id: String(doc.$id || fallbackId),
            title: normalizeText(doc.title),
            shortDescription: normalizeText(doc.shortDescription),
            technologiesUsed: typeof doc.technologiesUsed === 'string'
                ? doc.technologiesUsed.split(',').map((s: string) => s.trim()).filter(Boolean)
                : safeStringArray(doc.technologiesUsed),
            projectUrl: normalizeText(doc.projectUrl),
            repositoryUrl: normalizeText(doc.repositoryUrl),
        };
    }

    private async fetchStructuredSections(studentId: string) {
        const queries = [Query.equal('studentId', studentId), Query.orderAsc('sortOrder'), Query.limit(100)];
        const [achievements, education, experience, projects, skills] = await Promise.all([
            this.safeList(PROFILE_SECTION_COLLECTIONS.achievements, queries),
            this.safeList(PROFILE_SECTION_COLLECTIONS.education, queries),
            this.safeList(PROFILE_SECTION_COLLECTIONS.experience, queries),
            this.safeList(PROFILE_SECTION_COLLECTIONS.projects, queries),
            this.safeList(PROFILE_SECTION_COLLECTIONS.skills, queries),
        ]);

        return { achievements, education, experience, projects, skills };
    }

    private buildDirectorySearchText(student: StudentDoc): string {
        const legacy = this.buildLegacySummary(student);

        return [
            String(student.$id || ''),
            normalizeText(student.name),
            normalizeText(student.email),
            student.enrollmentYear != null ? String(student.enrollmentYear) : '',
            legacy.currentYear,
            legacy.headline,
            legacy.about,
            legacy.city,
            ...legacy.skills,
        ]
            .map((value) => normalizeSearchText(value))
            .filter(Boolean)
            .join(' ');
    }

    private async safeListByStudentIds(
        collectionId: string,
        studentIds: string[],
        queries: string[] = []
    ): Promise<Array<Record<string, any>>> {
        const uniqueStudentIds = [...new Set(studentIds.filter(Boolean))];
        if (uniqueStudentIds.length === 0) {
            return [];
        }

        return this.safeList(collectionId, [
            Query.equal('studentId', uniqueStudentIds),
            ...queries,
            Query.limit(500),
        ]);
    }

    private async buildProfileResponse(
        student: StudentDoc,
        mode: 'self' | 'public'
    ): Promise<StudentProfileResponse> {
        const [identity, profileDoc, sections] = await Promise.all([
            this.buildIdentity(student),
            this.safeGetProfileDoc(String(student.$id)),
            this.fetchStructuredSections(String(student.$id)),
        ]);

        const legacy = this.buildLegacySummary(student);

        const achievements = sections.achievements.length > 0
            ? sections.achievements.map((doc, index) => this.mapAchievement(doc, `achievement-${index}`))
            : legacy.achievements.map((doc, index) => this.mapAchievement(doc, `legacy-achievement-${index}`));
        const education = sections.education.length > 0
            ? sections.education.map((doc, index) => this.mapEducation(doc, `education-${index}`))
            : legacy.education.map((doc, index) => this.mapEducation(doc, `legacy-education-${index}`));
        const experience = sections.experience.length > 0
            ? sections.experience.map((doc, index) => this.mapExperience(doc, `experience-${index}`))
            : legacy.experience.map((doc, index) => this.mapExperience(doc, `legacy-experience-${index}`));
        const projects = sections.projects.length > 0
            ? sections.projects.map((doc, index) => this.mapProject(doc, `project-${index}`))
            : legacy.projects.map((doc, index) => this.mapProject(doc, `legacy-project-${index}`));
        const skills = sections.skills.length > 0
            ? sections.skills
                .map((doc) => normalizeText(doc.skill))
                .filter(Boolean)
            : legacy.skills;

        const about = normalizeText(profileDoc?.about) || legacy.about;
        const city = normalizeText(profileDoc?.city) || legacy.city;
        const currentYear = normalizeText(profileDoc?.currentYear) || legacy.currentYear;
        const cgpa = profileDoc?.cgpa != null ? String(profileDoc.cgpa) : legacy.cgpa;
        const profilePicture = this.normalizeProfilePictureUrl(profileDoc?.profilePicture) || legacy.profilePicture;
        const headline = this.buildHeadline(
            normalizeText(profileDoc?.headline) || legacy.headline,
            identity.departmentName,
            currentYear,
            skills
        );

        const completionScore = this.buildCompletionScore({
            about,
            city,
            currentYear,
            cgpa,
            profilePicture,
            skills,
            achievements,
            education,
            experience,
            projects,
        });

        return {
            identity: {
                ...identity,
                email: mode === 'self' ? identity.email : '',
                phoneNumber: mode === 'self' ? identity.phoneNumber : '',
            },
            summary: {
                headline,
                about,
                city,
                currentYear,
                cgpa,
                profilePicture,
                completionScore,
                skills,
            },
            achievements,
            education,
            experience,
            projects,
            privacy: {
                campusOnly: true,
                hideContactDetails: true,
            },
        };
    }

    async getMyProfile(studentUserId: string, tenantId: string, email: string): Promise<StudentProfileResponse> {
        const student = await studentService.getByUserId(studentUserId, tenantId, email);
        return this.buildProfileResponse(student, 'self');
    }

    async getCampusProfile(studentId: string, tenantId: string): Promise<StudentProfileResponse> {
        const student = await studentService.getById(studentId, tenantId);
        return this.buildProfileResponse(student, 'public');
    }

    private async deleteExistingSectionDocs(collectionId: string, studentId: string): Promise<void> {
        const existingDocs = await this.safeList(collectionId, [Query.equal('studentId', studentId), Query.limit(200)]);
        for (const doc of existingDocs) {
            await databases.deleteDocument(this.databaseId, collectionId, String(doc.$id));
        }
    }

    private async replaceSection<T extends Record<string, unknown>>(
        collectionId: string,
        studentId: string,
        tenantId: string,
        items: T[],
        mapper: (item: T, index: number) => Record<string, unknown>
    ): Promise<void> {
        try {
            await this.deleteExistingSectionDocs(collectionId, studentId);
            for (let index = 0; index < items.length; index += 1) {
                const item = items[index];
                await databases.createDocument(this.databaseId, collectionId, ID.unique(), {
                    tenantId,
                    studentId,
                    sortOrder: index,
                    ...mapper(item, index),
                });
            }
        } catch (error) {
            if (this.isMissingSchemaError(error)) {
                throw this.createMissingSchemaError(collectionId);
            }
            throw error;
        }
    }

    async updateMyProfile(
        studentUserId: string,
        tenantId: string,
        email: string,
        input: UpdateStudentProfileInput
    ): Promise<StudentProfileResponse> {
        const student = await studentService.getByUserId(studentUserId, tenantId, email);
        const studentId = String(student.$id || studentUserId);
        const safeInput = {
            headline: normalizeText(input.headline),
            about: normalizeText(input.about),
            city: normalizeText(input.city),
            currentYear: normalizeText(input.currentYear),
            cgpa: normalizeText(input.cgpa),
            profilePicture: this.normalizeProfilePictureUrl(input.profilePicture),
            skills: safeStringArray(input.skills),
            achievements: normalizeArray<Record<string, unknown>>(input.achievements),
            education: normalizeArray<Record<string, unknown>>(input.education),
            experience: normalizeArray<Record<string, unknown>>(input.experience),
            projects: normalizeArray<Record<string, unknown>>(input.projects),
        };

        const profilePayload = {
            tenantId,
            studentId,
            headline: safeInput.headline,
            about: safeInput.about,
            city: safeInput.city,
            currentYear: safeInput.currentYear,
            cgpa: safeFloat(safeInput.cgpa),
            profilePicture: nullableText(this.normalizeProfilePictureUrl(safeInput.profilePicture)),
            searchableName: normalizeText(student.name).toLowerCase(),
        };

        try {
            const existing = await this.safeGetProfileDoc(studentId);
            if (existing) {
                await databases.updateDocument(this.databaseId, this.profileCollectionId, studentId, profilePayload);
            } else {
                await databases.createDocument(this.databaseId, this.profileCollectionId, studentId, profilePayload);
            }
        } catch (error) {
            if (this.isMissingSchemaError(error)) {
                throw this.createMissingSchemaError(this.profileCollectionId);
            }
            throw error;
        }

        await Promise.all([
            this.replaceSection(
                PROFILE_SECTION_COLLECTIONS.skills,
                studentId,
                tenantId,
                safeInput.skills.map((skill) => ({ skill })),
                (item) => ({ skill: normalizeText(item.skill) })
            ),
            this.replaceSection(
                PROFILE_SECTION_COLLECTIONS.achievements,
                studentId,
                tenantId,
                safeInput.achievements,
                (item) => ({
                    title: normalizeText(item.title),
                    description: normalizeText(item.description),
                    certificateUrl: nullableText(item.certificateUrl),
                })
            ),
            this.replaceSection(
                PROFILE_SECTION_COLLECTIONS.education,
                studentId,
                tenantId,
                safeInput.education,
                (item) => ({
                    level: normalizeText(item.level),
                    institution: normalizeText(item.institution),
                    board: normalizeText(item.board),
                    department: normalizeText(item.department),
                    marks: safeFloat(item.marks),
                    year: safeInt(item.year),
                })
            ),
            this.replaceSection(
                PROFILE_SECTION_COLLECTIONS.experience,
                studentId,
                tenantId,
                safeInput.experience,
                (item) => ({
                    title: normalizeText(item.title),
                    company: normalizeText(item.company),
                    description: normalizeText(item.description),
                    start: normalizeText(item.start),
                    end: nullableText(item.end),
                    certificateUrl: nullableText(item.certificateUrl),
                })
            ),
            this.replaceSection(
                PROFILE_SECTION_COLLECTIONS.projects,
                studentId,
                tenantId,
                safeInput.projects,
                (item) => ({
                    title: normalizeText(item.title),
                    shortDescription: normalizeText(item.shortDescription),
                    technologiesUsed: safeStringArray(item.technologiesUsed).join(', '),
                    projectUrl: nullableText(item.projectUrl),
                    repositoryUrl: nullableText(item.repositoryUrl),
                })
            ),
        ]);

        return this.getMyProfile(studentUserId, tenantId, email);
    }

    async uploadProfileAsset(
        studentUserId: string,
        tenantId: string,
        email: string,
        input: {
            assetType: 'profile_photo' | 'certificate';
            fileName: string;
            fileType: string;
            fileBase64: string;
        }
    ): Promise<{ fileId: string; bucketId: string; fileUrl: string }> {
        const student = await studentService.getByUserId(studentUserId, tenantId, email);
        const studentId = String(student.$id || studentUserId);

        const fileType = normalizeText(input.fileType).toLowerCase();
        const fileName = normalizeText(input.fileName) || `${input.assetType}-${Date.now()}`;
        const sourceBuffer = decodeBase64Payload(input.fileBase64);

        if (!sourceBuffer.length) {
            throw new ValidationError('Uploaded file is empty.');
        }

        const isProfilePhoto = input.assetType === 'profile_photo';
        const maxInputSizeBytes = isProfilePhoto ? 8 * 1024 * 1024 : 10 * 1024 * 1024;
        if (sourceBuffer.length > maxInputSizeBytes) {
            throw new ValidationError(
                isProfilePhoto
                    ? 'Profile photo must be under 8MB.'
                    : 'Certificate file must be under 10MB.'
            );
        }

        const ALLOWED_PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const profileMimeAllowed = ALLOWED_PROFILE_PHOTO_TYPES.includes(fileType);
        const certificateMimeAllowed = fileType === 'application/pdf' || ALLOWED_PROFILE_PHOTO_TYPES.includes(fileType);

        if (isProfilePhoto && !profileMimeAllowed) {
            throw new ValidationError('Profile photo must be a JPG, PNG, WebP, or GIF image.');
        }

        if (!isProfilePhoto && !certificateMimeAllowed) {
            throw new ValidationError('Certificates must be a PDF, JPG, PNG, WebP, or GIF file.');
        }

        let uploadBuffer = sourceBuffer;
        let uploadFileType = fileType || 'application/octet-stream';
        let uploadFileName = fileName;

        if (isProfilePhoto) {
            try {
                uploadBuffer = await normalizeProfilePhoto(sourceBuffer);
            } catch {
                throw new ValidationError('Invalid profile photo. Please upload a valid image file.');
            }
            uploadFileType = 'image/png';
            const baseName = fileName.replace(/\.[^.]+$/, '') || 'profile-photo';
            uploadFileName = `${baseName}.png`;
        }

        const bucketId = isProfilePhoto ? this.profilePhotoBucketId : this.certificateBucketId;
        const safeName = uploadFileName.replace(/[^\w.\-]/g, '_');
        const uploadFile = new File(
            [uploadBuffer],
            `${studentId}-${Date.now()}-${safeName}`,
            { type: uploadFileType }
        );
        const uploadedFile = await storage.createFile(
            bucketId,
            ID.unique(),
            uploadFile,
            [Permission.read(Role.any())]
        );

        const fileId = String(uploadedFile.$id);
        const fileUrl = isProfilePhoto
            ? this.buildProfilePhotoUrl(bucketId, fileId)
            : `${trimTrailingSlash(env.APPWRITE_ENDPOINT)}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}/view?project=${encodeURIComponent(env.APPWRITE_PROJECT_ID)}`;

        return { fileId, bucketId, fileUrl };
    }

    async searchDirectory(
        tenantId: string,
        query: string,
        page: number,
        limit: number
    ): Promise<{ students: StudentDirectoryItem[]; total: number }> {
        const trimmedQuery = normalizeSearchText(query);
        if (!trimmedQuery) {
            return { students: [], total: 0 };
        }

        const directory = await studentService.list(tenantId, 1, 500);
        const matchedStudents = directory.students.filter((student) => {
            const searchableText = this.buildDirectorySearchText(student);
            return searchableText.includes(trimmedQuery);
        });

        if (matchedStudents.length === 0) {
            return { students: [], total: 0 };
        }

        const total = matchedStudents.length;
        const start = (page - 1) * limit;
        const pagedStudents = matchedStudents
            .sort((a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name)))
            .slice(start, start + limit);
        const studentIds = pagedStudents
            .map((student) => String(student.$id || ''))
            .filter(Boolean);

        const [profileDocs, skillDocs, achievementDocs, projectDocs] = await Promise.all([
            Promise.all(studentIds.map(async (studentId) => {
                const doc = await this.safeGetProfileDoc(studentId);
                return doc ? ([studentId, doc] as const) : null;
            })),
            this.safeListByStudentIds(PROFILE_SECTION_COLLECTIONS.skills, studentIds, [Query.orderAsc('sortOrder')]),
            this.safeListByStudentIds(PROFILE_SECTION_COLLECTIONS.achievements, studentIds),
            this.safeListByStudentIds(PROFILE_SECTION_COLLECTIONS.projects, studentIds),
        ]);

        const profileByStudentId = new Map(
            profileDocs.filter((entry): entry is readonly [string, Record<string, any>] => entry !== null)
        );
        const skillsByStudentId = new Map<string, string[]>();
        const achievementCountByStudentId = new Map<string, number>();
        const projectCountByStudentId = new Map<string, number>();

        for (const doc of skillDocs) {
            const studentId = String(doc.studentId || '');
            if (!studentId) continue;
            const current = skillsByStudentId.get(studentId) || [];
            const skill = normalizeText(doc.skill);
            if (skill) current.push(skill);
            skillsByStudentId.set(studentId, current);
        }

        for (const doc of achievementDocs) {
            const studentId = String(doc.studentId || '');
            achievementCountByStudentId.set(studentId, (achievementCountByStudentId.get(studentId) || 0) + 1);
        }

        for (const doc of projectDocs) {
            const studentId = String(doc.studentId || '');
            projectCountByStudentId.set(studentId, (projectCountByStudentId.get(studentId) || 0) + 1);
        }

        const items = await Promise.all(
            pagedStudents.map(async (student) => {
                const identity = await this.buildIdentity(student);
                const legacy = this.buildLegacySummary(student);
                const profileDoc = profileByStudentId.get(String(student.$id));
                const skills = skillsByStudentId.get(String(student.$id)) || legacy.skills;
                const currentYear = normalizeText(profileDoc?.currentYear) || legacy.currentYear;
                const headline = this.buildHeadline(
                    normalizeText(profileDoc?.headline) || legacy.headline,
                    identity.departmentName,
                    currentYear,
                    skills
                );

                return {
                    studentId: String(student.$id || ''),
                    name: identity.name,
                    departmentName: identity.departmentName,
                    collegeName: identity.collegeName,
                    currentYear,
                    headline,
                    city: normalizeText(profileDoc?.city) || legacy.city,
                    about: normalizeText(profileDoc?.about) || legacy.about,
                    profilePicture: this.normalizeProfilePictureUrl(profileDoc?.profilePicture) || legacy.profilePicture,
                    skills,
                    achievementsCount: achievementCountByStudentId.get(String(student.$id)) || legacy.achievements.length,
                    projectsCount: projectCountByStudentId.get(String(student.$id)) || legacy.projects.length,
                } satisfies StudentDirectoryItem;
            })
        );

        return {
            students: items,
            total,
        };
    }
}

export const studentProfileService = new StudentProfileService();
